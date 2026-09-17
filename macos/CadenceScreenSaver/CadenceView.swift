import ScreenSaver
import WebKit
import AppKit

@objc(CadenceView)
public class CadenceView: ScreenSaverView {
    private var webView: WKWebView!
    private var mediaBridge: MediaRemoteBridge?
    private var isConfigured = false

    public override init?(frame: NSRect, isPreview: Bool) {
        super.init(frame: frame, isPreview: isPreview)
        // 60fps full-speed rendering for Framer Motion kinetic typography
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
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        if #available(macOS 11.0, *) {
            config.defaultWebpagePreferences.allowsContentJavaScript = true
        }

        webView = WKWebView(frame: self.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.setValue(false, forKey: "drawsBackground") // Transparent background

        // Disable rubber band bouncing
        if let scrollView = webView.enclosingScrollView {
            scrollView.hasVerticalScroller = false
            scrollView.hasHorizontalScroller = false
            scrollView.horizontalScrollElasticity = .none
            scrollView.verticalScrollElasticity = .none
        }

        self.addSubview(webView)

        // Load Vite React bundle from bundle Resources/dist/index.html
        loadWebApp()

        // Initialize zero-config Native Media Remote Bridge
        mediaBridge = MediaRemoteBridge { [weak self] payload in
            self?.dispatchToWebView(payload: payload)
        }
    }

    private func loadWebApp() {
        let bundle = Bundle(for: type(of: self))

        // Check for bundled dist/index.html
        if let distUrl = bundle.url(forResource: "index", withExtension: "html", subdirectory: "dist") {
            let baseDir = distUrl.deletingLastPathComponent()
            webView.loadFileURL(distUrl, allowingReadAccessTo: baseDir)
            return
        }

        // Fallback: check root Resources/index.html
        if let rootUrl = bundle.url(forResource: "index", withExtension: "html") {
            webView.loadFileURL(rootUrl, allowingReadAccessTo: rootUrl.deletingLastPathComponent())
            return
        }

        // Development fallback: if testing locally during development
        if let devUrl = URL(string: "http://127.0.0.1:5173/") {
            webView.load(URLRequest(url: devUrl))
        }
    }

    private func dispatchToWebView(payload: [String: Any]) {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: payload, options: []),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            return
        }

        let js = "window.dispatchEvent(new CustomEvent('nowPlayingUpdate', { detail: \(jsonString) }));"
        DispatchQueue.main.async { [weak self] in
            self?.webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    public override func startAnimation() {
        super.startAnimation()
        // Resume any paused web animations
        webView.evaluateJavaScript("document.body.style.display = 'block';", completionHandler: nil)
    }

    public override func stopAnimation() {
        super.stopAnimation()
    }

    public override func animateOneFrame() {
        // Handled by WKWebView's internal 60fps display link and requestAnimationFrame
    }

    public override var hasConfigureSheet: Bool {
        return false
    }

    public override var configureSheet: NSWindow? {
        return nil
    }
}
