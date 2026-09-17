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
public class CadenceView: ScreenSaverView, WKNavigationDelegate {
    private var webView: WKWebView!
    private var mediaBridge: MediaRemoteBridge?
    private var isConfigured = false
    private var activityToken: NSObjectProtocol?

    public override init?(frame: NSRect, isPreview: Bool) {
        super.init(frame: frame, isPreview: isPreview)
        self.animationTimeInterval = 1.0 / 60.0
        self.wantsLayer = true
        self.layer?.backgroundColor = NSColor(red: 0.02, green: 0.02, blue: 0.03, alpha: 1.0).cgColor

        DispatchQueue.main.async { [weak self] in
            self?.setupView()
        }
    }

    public required init?(coder: NSCoder) {
        super.init(coder: coder)
        self.animationTimeInterval = 1.0 / 60.0
        self.wantsLayer = true
        self.layer?.backgroundColor = NSColor(red: 0.02, green: 0.02, blue: 0.03, alpha: 1.0).cgColor

        DispatchQueue.main.async { [weak self] in
            self?.setupView()
        }
    }

    deinit {
        if let token = activityToken {
            ProcessInfo.processInfo.endActivity(token)
        }
        mediaBridge?.stop()
    }

    private func preventProcessSuspension() {
        if activityToken == nil {
            activityToken = ProcessInfo.processInfo.beginActivity(
                options: [.userInitiated, .idleDisplaySleepDisabled, .latencyCritical],
                reason: "Cadence 60fps kinetic visualizer active"
            )
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

        // 1. Register custom URL scheme handler to bypass all sandboxed file:// restrictions
        let schemeHandler = CadenceSchemeHandler(distURL: distUrl)
        config.setURLSchemeHandler(schemeHandler, forURLScheme: "cadence")

        // 2. Add JavaScript console log bridge to system NSLog
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

        webView = WKWebView(frame: self.bounds, configuration: config)
        webView.navigationDelegate = self
        webView.autoresizingMask = [.width, .height]
        webView.setValue(true, forKey: "drawsBackground")
        webView.underPageBackgroundColor = NSColor(red: 0.02, green: 0.02, blue: 0.03, alpha: 1.0)

        // Disable scrolling bounce
        if let scrollView = webView.enclosingScrollView {
            scrollView.hasVerticalScroller = false
            scrollView.hasHorizontalScroller = false
            scrollView.horizontalScrollElasticity = .none
            scrollView.verticalScrollElasticity = .none
        }

        self.addSubview(webView)

        // Load via custom origin: full CORS and ES module support without file:// sandbox blocks
        let appURL = URL(string: "cadence://app/index.html")!
        NSLog("CADENCE: Loading URL \(appURL.absoluteString)")
        webView.load(URLRequest(url: appURL))

        // Connect native MediaRemote push update engine
        mediaBridge = MediaRemoteBridge { [weak self] payload in
            self?.dispatchToWebView(payload: payload)
        }
    }

    public override func setFrameSize(_ newSize: NSSize) {
        super.setFrameSize(newSize)
        webView?.frame = self.bounds
    }

    public override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        if window != nil {
            setupView()
            webView?.frame = self.bounds
        }
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
        webView.reload()
    }

    public override func startAnimation() {
        super.startAnimation()
        setupView()
        preventProcessSuspension()
    }

    public override func stopAnimation() {
        super.stopAnimation()
    }

    public override func draw(_ dirtyRect: NSRect) {
        // Intentionally empty: Do NOT call super.draw(dirtyRect) which fills the view with black!
    }

    public override func animateOneFrame() {
        // Driven at 60fps by WKWebView internal display link
    }

    public override var hasConfigureSheet: Bool {
        return false
    }

    public override var configureSheet: NSWindow? {
        return nil
    }
}
