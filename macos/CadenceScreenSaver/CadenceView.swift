import ScreenSaver
import WebKit
import AppKit

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

        // Defer WebKit initialization past init to prevent init watchdog timeout
        DispatchQueue.main.async { [weak self] in
            self?.setupView()
        }
    }

    public required init?(coder: NSCoder) {
        super.init(coder: coder)
        self.animationTimeInterval = 1.0 / 60.0
        self.wantsLayer = true
        self.layer?.backgroundColor = NSColor(red: 0.02, green: 0.02, blue: 0.03, alpha: 1.0).cgColor

        // Defer WebKit initialization past init to prevent init watchdog timeout
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

    /**
     * Prevents runningboardd from suspending the WebContent process
     * when macOS thinks the screen saver helper is in App Nap or background.
     */
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

        let config = WKWebViewConfiguration()
        config.suppressesIncrementalRendering = false
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        if #available(macOS 11.0, *) {
            config.defaultWebpagePreferences.allowsContentJavaScript = true
        }

        // Bridge JS console errors to system NSLog
        let userScript = WKUserScript(
            source: """
            window.addEventListener('error', (e) => console.log('[Cadence JS Error]', e.message, e.filename, e.lineno));
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        config.userContentController.addUserScript(userScript)

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

        // Load web application
        loadWebApp()

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
        webView?.frame = self.bounds
    }

    private func loadWebApp() {
        let bundle = Bundle(for: type(of: self))
        NSLog("CADENCE: Checking bundle at \(bundle.bundlePath)")

        guard let htmlURL = bundle.url(forResource: "index", withExtension: "html", subdirectory: "dist") ?? {
            let directUrl = bundle.bundleURL.appendingPathComponent("Contents/Resources/dist/index.html")
            if FileManager.default.fileExists(atPath: directUrl.path) { return directUrl }
            let fallbackUrl = URL(fileURLWithPath: NSHomeDirectory() + "/Library/Screen Savers/Cadence.saver/Contents/Resources/dist/index.html")
            if FileManager.default.fileExists(atPath: fallbackUrl.path) { return fallbackUrl }
            return nil
        }() else {
            NSLog("CADENCE: FATAL — index.html not found in bundle at \(bundle.bundlePath)")
            return
        }

        NSLog("CADENCE: Loading from \(htmlURL.path)")
        if htmlURL.isFileURL {
            webView.loadFileURL(htmlURL, allowingReadAccessTo: bundle.bundleURL)
        } else {
            webView.load(URLRequest(url: htmlURL))
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
        NSLog("[Cadence] Navigation error: \(error.localizedDescription)")
    }

    public func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        NSLog("[Cadence] Provisional navigation error: \(error.localizedDescription)")
    }

    public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        NSLog("[Cadence] Web view successfully loaded and active!")
    }

    public func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        NSLog("[Cadence] WebContent process was terminated. Reloading webview.")
        webView.reload()
    }

    public override func startAnimation() {
        super.startAnimation()
        preventProcessSuspension()
    }

    public override func stopAnimation() {
        super.stopAnimation()
    }

    public override func draw(_ dirtyRect: NSRect) {
        // Intentionally empty: Do NOT call super.draw(dirtyRect) which fills the view with black!
        // WKWebView is a layer-backed view that renders its own surface.
    }

    public override func animateOneFrame() {
        // WKWebView renders via its own internal 60fps display link.
        // Do NOT call self.needsDisplay = true, which triggers ScreenSaverView's black drawRect.
    }

    public override var hasConfigureSheet: Bool {
        return false
    }

    public override var configureSheet: NSWindow? {
        return nil
    }

}
