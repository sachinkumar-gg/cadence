import ScreenSaver
import WebKit
import AppKit

@objc(CadenceView)
public class CadenceView: ScreenSaverView, WKNavigationDelegate {
    private var webView: WKWebView!
    private var mediaBridge: MediaRemoteBridge?
    private var isConfigured = false

    public override init?(frame: NSRect, isPreview: Bool) {
        super.init(frame: frame, isPreview: isPreview)
        self.animationTimeInterval = 1.0 / 60.0
        setupView()
    }

    public required init?(coder: NSCoder) {
        super.init(coder: coder)
        self.animationTimeInterval = 1.0 / 60.0
        setupView()
    }

    private func setupView() {
        guard !isConfigured else { return }
        isConfigured = true

        self.wantsLayer = true
        self.layer?.backgroundColor = NSColor.black.cgColor

        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        if #available(macOS 11.0, *) {
            config.defaultWebpagePreferences.allowsContentJavaScript = true
        }

        // Bridge console.log to system NSLog for debugging
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
        webView.setValue(false, forKey: "drawsBackground")

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

    private func loadWebApp() {
        let bundle = Bundle(for: type(of: self))
        let directUrl = bundle.bundleURL.appendingPathComponent("Contents/Resources/dist/index.html")

        let targetUrl: URL
        if FileManager.default.fileExists(atPath: directUrl.path) {
            targetUrl = directUrl
        } else if let resourceUrl = bundle.url(forResource: "index", withExtension: "html", subdirectory: "dist") {
            targetUrl = resourceUrl
        } else if let rootUrl = bundle.url(forResource: "index", withExtension: "html") {
            targetUrl = rootUrl
        } else {
            // Local dev fallback
            targetUrl = URL(string: "http://127.0.0.1:5173/")!
        }

        NSLog("[Cadence] Loading web surface from: \(targetUrl.path)")
        if targetUrl.isFileURL {
            webView.loadFileURL(targetUrl, allowingReadAccessTo: bundle.bundleURL)
        } else {
            webView.load(URLRequest(url: targetUrl))
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
        NSLog("[Cadence] Web view successfully loaded!")
    }

    public override func startAnimation() {
        super.startAnimation()
    }

    public override func stopAnimation() {
        super.stopAnimation()
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
