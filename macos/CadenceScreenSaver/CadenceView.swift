import ScreenSaver
import WebKit
import AppKit

// MARK: - WKURLSchemeHandler for zero-sandbox-violation asset serving
final class CadenceSchemeHandler: NSObject, WKURLSchemeHandler {
    private let distURL: URL

    init(distURL: URL) {
        self.distURL = distURL
        super.init()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(NSError(domain: "Cadence", code: 400, userInfo: nil))
            return
        }

        var path = url.path
        if path.isEmpty || path == "/" {
            path = "/index.html"
        }

        let cleanPath = path.hasPrefix("/") ? String(path.dropFirst()) : path
        let fileURL = distURL.appendingPathComponent(cleanPath)

        guard let data = try? Data(contentsOf: fileURL) else {
            NSLog("CADENCE: Scheme 404 for path: \(cleanPath) at \(fileURL.path)")
            urlSchemeTask.didFailWithError(NSError(domain: "Cadence", code: 404, userInfo: nil))
            return
        }

        let mimeType: String
        let ext = fileURL.pathExtension.lowercased()
        switch ext {
        case "html": mimeType = "text/html"
        case "js", "mjs": mimeType = "application/javascript"
        case "css": mimeType = "text/css"
        case "woff2": mimeType = "font/woff2"
        case "woff": mimeType = "font/woff"
        case "svg": mimeType = "image/svg+xml"
        case "png": mimeType = "image/png"
        case "jpg", "jpeg": mimeType = "image/jpeg"
        case "json": mimeType = "application/json"
        default: mimeType = "application/octet-stream"
        }

        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": mimeType,
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache",
                "Content-Length": "\(data.count)"
            ]
        )!

        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
    }
}

// MARK: - JS Console Bridge to system NSLog
final class CadenceLogHandler: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        NSLog("CADENCE JS LOG: \(message.body)")
    }
}

@objc(CadenceView)
public class CadenceView: ScreenSaverView, WKNavigationDelegate, WKUIDelegate {
    private var webView: WKWebView?
    private var mediaBridge: MediaRemoteBridge?
    private var isConfigured = false
    private var activityToken: NSObjectProtocol?

    // 1. CRITICAL: Disable macOS ScreenSaver gamma fade to black
    public override class func performGammaFade() -> Bool {
        return false
    }

    public override init?(frame: NSRect, isPreview: Bool) {
        super.init(frame: frame, isPreview: isPreview)
        setupCommon()
    }

    public required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupCommon()
    }

    private func setupCommon() {
        self.animationTimeInterval = 1.0 / 60.0
        self.wantsLayer = true
        self.layer?.backgroundColor = NSColor(red: 0.02, green: 0.02, blue: 0.03, alpha: 1.0).cgColor
        self.autoresizesSubviews = true
    }

    deinit {
        if let token = activityToken {
            ProcessInfo.processInfo.endActivity(token)
        }
        mediaBridge?.stop()
        mediaBridge = nil
        webView?.navigationDelegate = nil
        webView?.uiDelegate = nil
        webView?.removeFromSuperview()
        webView = nil
    }

    private func preventProcessSuspension() {
        if activityToken == nil {
            activityToken = ProcessInfo.processInfo.beginActivity(
                options: [.userInitiated, .idleDisplaySleepDisabled, .latencyCritical, .userInitiatedAllowingIdleSystemSleep],
                reason: "Cadence 60fps kinetic visualizer active"
            )
        }
    }

    // Safe dynamic invocation of private WebKit APIs to disable throttling & occlusion
    private func setPrivateBool(target: AnyObject, selector: String, value: Bool) {
        let sel = Selector((selector))
        if target.responds(to: sel),
           let method = class_getInstanceMethod(type(of: target), sel) {
            let imp = method_getImplementation(method)
            typealias MethodSignature = @convention(c) (AnyObject, Selector, Bool) -> Void
            let fn = unsafeBitCast(imp, to: MethodSignature.self)
            fn(target, sel, value)
            NSLog("CADENCE: Enabled private setting \(selector) = \(value) on \(type(of: target))")
        }
    }

    private func setupView() {
        guard !isConfigured else { return }
        isConfigured = true
        preventProcessSuspension()

        self.wantsLayer = true
        self.layer?.backgroundColor = NSColor(red: 0.02, green: 0.02, blue: 0.03, alpha: 1.0).cgColor

        let bundle = Bundle(for: type(of: self))
        let distUrl: URL
        let bundledDist = bundle.bundleURL.appendingPathComponent("Contents/Resources/dist")
        let userSaverDist = URL(fileURLWithPath: NSHomeDirectory() + "/Library/Screen Savers/Cadence.saver/Contents/Resources/dist")

        if FileManager.default.fileExists(atPath: bundledDist.appendingPathComponent("index.html").path) {
            distUrl = bundledDist
        } else if FileManager.default.fileExists(atPath: userSaverDist.appendingPathComponent("index.html").path) {
            distUrl = userSaverDist
        } else {
            distUrl = bundle.resourceURL?.appendingPathComponent("dist") ?? bundledDist
        }

        NSLog("CADENCE: Serving dist from \(distUrl.path)")

        let config = WKWebViewConfiguration()
        config.suppressesIncrementalRendering = false
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        if #available(macOS 11.0, *) {
            config.defaultWebpagePreferences.allowsContentJavaScript = true
        }

        // CRITICAL ANTI-SUSPENSION FIXES FOR macOS SONOMA & SEQUOIA:
        // 1. Prevent WebKit from suppressing the WebContent process when occluded or in background
        setPrivateBool(target: config.preferences, selector: "_setPageVisibilityBasedProcessSuppressionEnabled:", value: false)
        // 2. Prevent WebKit from throttling DOM timers (requestAnimationFrame, setInterval)
        setPrivateBool(target: config.preferences, selector: "_setDOMTimersThrottlingEnabled:", value: false)
        setPrivateBool(target: config.preferences, selector: "_setHiddenPageDOMTimerThrottlingEnabled:", value: false)

        // 3. Register custom URL scheme handler to bypass all sandboxed file:// restrictions
        let schemeHandler = CadenceSchemeHandler(distURL: distUrl)
        config.setURLSchemeHandler(schemeHandler, forURLScheme: "cadence")

        // 4. Add JavaScript console log bridge to system NSLog
        let logHandler = CadenceLogHandler()
        config.userContentController.add(logHandler, name: "cadenceLog")

        let jsBridge = """
        (function() {
            const origLog = console.log;
            const origErr = console.error;
            console.log = function(...args) {
                origLog.apply(console, args);
                try { window.webkit.messageHandlers.cadenceLog.postMessage(args.map(String).join(' ')); } catch(_) {}
            };
            console.error = function(...args) {
                origErr.apply(console, args);
                try { window.webkit.messageHandlers.cadenceLog.postMessage('ERROR: ' + args.map(String).join(' ')); } catch(_) {}
            };
            window.addEventListener('error', function(e) {
                try { window.webkit.messageHandlers.cadenceLog.postMessage('FATAL JS: ' + e.message + ' at ' + e.filename + ':' + e.lineno); } catch(_) {}
            });
        })();
        """
        config.userContentController.addUserScript(WKUserScript(source: jsBridge, injectionTime: .atDocumentStart, forMainFrameOnly: false))

        var initialFrame = self.bounds
        if initialFrame.width <= 0 || initialFrame.height <= 0 {
            if let screen = self.window?.screen ?? NSScreen.main {
                initialFrame = NSRect(origin: .zero, size: screen.frame.size)
            } else {
                initialFrame = NSRect(x: 0, y: 0, width: 1920, height: 1080)
            }
        }

        let wv = WKWebView(frame: initialFrame, configuration: config)
        wv.navigationDelegate = self
        wv.uiDelegate = self
        wv.autoresizingMask = [.width, .height]
        wv.setValue(false, forKey: "drawsBackground")
        wv.underPageBackgroundColor = NSColor(red: 0.02, green: 0.02, blue: 0.03, alpha: 1.0)

        // 5. CRITICAL: Disable window occlusion detection so WebKit treats the screensaver as always visible
        setPrivateBool(target: wv, selector: "_setWindowOcclusionDetectionEnabled:", value: false)

        // Disable scrolling bounce
        if let scrollView = wv.enclosingScrollView {
            scrollView.hasVerticalScroller = false
            scrollView.hasHorizontalScroller = false
            scrollView.horizontalScrollElasticity = .none
            scrollView.verticalScrollElasticity = .none
        }

        self.addSubview(wv)
        self.webView = wv

        // Load via custom origin: full CORS and ES module support without file:// sandbox blocks
        let appURL = URL(string: "cadence://app/index.html")!
        NSLog("CADENCE: Loading URL \(appURL.absoluteString)")
        wv.load(URLRequest(url: appURL))

        // Connect native MediaRemote push update engine
        mediaBridge = MediaRemoteBridge { [weak self] payload in
            self?.dispatchToWebView(payload: payload)
        }
    }

    public override func setFrameSize(_ newSize: NSSize) {
        super.setFrameSize(newSize)
        if newSize.width > 0 && newSize.height > 0 {
            webView?.frame = NSRect(origin: .zero, size: newSize)
        }
    }

    public override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        if window != nil {
            setupView()
            if let wv = webView {
                setPrivateBool(target: wv, selector: "_setWindowOcclusionDetectionEnabled:", value: false)
                wv.frame = self.bounds
            }
        }
    }

    public override func startAnimation() {
        super.startAnimation()
        setupView()
        preventProcessSuspension()
        if let wv = webView {
            setPrivateBool(target: wv, selector: "_setWindowOcclusionDetectionEnabled:", value: false)
        }
    }

    public override func stopAnimation() {
        super.stopAnimation()
    }

    private func dispatchToWebView(payload: [String: Any]) {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: payload, options: []),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            return
        }

        let js = "window.dispatchEvent(new CustomEvent('nowPlayingUpdate', { detail: \(jsonString) }));"
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    // MARK: - Input / Focus Overrides (Prevent capturing focus from ScreenSaverEngine)
    public override func hitTest(_ point: NSPoint) -> NSView? {
        return self
    }

    public override var acceptsFirstResponder: Bool {
        return false
    }

    public override func resignFirstResponder() -> Bool {
        return false
    }

    // MARK: - WKNavigationDelegate
    public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        NSLog("CADENCE: Navigation error: \(error.localizedDescription)")
    }

    public func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        NSLog("CADENCE: Provisional navigation error: \(error.localizedDescription)")
    }

    public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        NSLog("CADENCE: Web view successfully loaded and active at 60fps!")
    }

    public func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        NSLog("CADENCE: WebContent process terminated. Reloading...")
        let appURL = URL(string: "cadence://app/index.html")!
        webView.load(URLRequest(url: appURL))
    }

    // MARK: - Drawing & Animation
    public override func draw(_ dirtyRect: NSRect) {
        // Clear/dark background fill to avoid visual glitches before webview renders
        NSColor(red: 0.02, green: 0.02, blue: 0.03, alpha: 1.0).setFill()
        dirtyRect.fill()
    }

    public override func animateOneFrame() {
        super.animateOneFrame()
    }

    public override var hasConfigureSheet: Bool {
        return false
    }

    public override var configureSheet: NSWindow? {
        return nil
    }
}
