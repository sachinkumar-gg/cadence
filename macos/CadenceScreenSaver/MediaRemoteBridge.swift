import Foundation
import AppKit

public typealias MediaUpdateCallback = ([String: Any]) -> Void

final class MediaRemoteBridge {
    private var updateCallback: MediaUpdateCallback?
    private var isUsingMediaRemote = false
    private var appleScriptTimer: Timer?
    private var fallbackWatchdogTimer: Timer?
    private var lastMediaRemoteTimestamp: TimeInterval = 0

    // Dynamic C function pointer types for private MediaRemote.framework
    private typealias MRRegisterFn = @convention(c) (DispatchQueue) -> Void
    private typealias MRGetInfoFn = @convention(c) (DispatchQueue, @escaping @convention(block) (CFDictionary?) -> Void) -> Void
    private typealias MRUnregisterFn = @convention(c) () -> Void

    private var mrRegister: MRRegisterFn?
    private var mrGetInfo: MRGetInfoFn?
    private var mrUnregister: MRUnregisterFn?

    // Pre-compiled NSAppleScript (fast in-process execution, 0 process spawn overhead)
    private lazy var compiledAppleScript: NSAppleScript? = {
        let scriptSource = """
        tell application "System Events"
            set isSpotify to (exists (processes where name is "Spotify"))
            set isMusic to (exists (processes where name is "Music"))
        end tell
        if isSpotify then
            tell application "Spotify"
                set pState to player state as string
                if pState is not "stopped" then
                    set tName to name of current track
                    set tArtist to artist of current track
                    set tAlbum to album of current track
                    set tDuration to (duration of current track) / 1000
                    set tPosition to player position
                    set tArt to artwork url of current track
                    return "OK|||Spotify|||" & tName & "|||" & tArtist & "|||" & tAlbum & "|||" & tDuration & "|||" & tPosition & "|||" & pState & "|||" & tArt
                end if
            end tell
        else if isMusic then
            tell application "Music"
                set pState to player state as string
                if pState is not "stopped" then
                    set tName to name of current track
                    set tArtist to artist of current track
                    set tAlbum to album of current track
                    set tDuration to duration of current track
                    set tPosition to player position
                    return "OK|||Apple Music|||" & tName & "|||" & tArtist & "|||" & tAlbum & "|||" & tDuration & "|||" & tPosition & "|||" & pState & "|||"
                end if
            end tell
        end if
        return "INACTIVE"
        """
        return NSAppleScript(source: scriptSource)
    }()

    init(onUpdate: @escaping MediaUpdateCallback) {
        self.updateCallback = onUpdate
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.setupMediaPipeline()
        }
    }

    deinit {
        stop()
    }

    public func stop() {
        DispatchQueue.main.async { [weak self] in
            self?.appleScriptTimer?.invalidate()
            self?.appleScriptTimer = nil
            self?.fallbackWatchdogTimer?.invalidate()
            self?.fallbackWatchdogTimer = nil

            if let isMR = self?.isUsingMediaRemote, isMR, let unreg = self?.mrUnregister {
                unreg()
            }
            if let s = self {
                NotificationCenter.default.removeObserver(s)
            }
        }
    }

    private func setupMediaPipeline() {
        let frameworkPath = "/System/Library/PrivateFrameworks/MediaRemote.framework/MediaRemote"
        guard let handle = dlopen(frameworkPath, RTLD_NOW) else {
            NSLog("[Cadence] MediaRemote dlopen failed. Activating NSAppleScript fallback.")
            DispatchQueue.main.async { [weak self] in
                self?.activateAppleScriptFallback(reason: "MediaRemote framework not loadable")
            }
            return
        }

        guard let regSym = dlsym(handle, "MRMediaRemoteRegisterForNowPlayingNotifications"),
              let getInfoSym = dlsym(handle, "MRMediaRemoteGetNowPlayingInfo"),
              let unregSym = dlsym(handle, "MRMediaRemoteUnregisterForNowPlayingNotifications") else {
            NSLog("[Cadence] MediaRemote symbol resolution failed. Activating NSAppleScript fallback.")
            DispatchQueue.main.async { [weak self] in
                self?.activateAppleScriptFallback(reason: "MediaRemote symbols missing in macOS version")
            }
            return
        }

        mrRegister = unsafeBitCast(regSym, to: MRRegisterFn.self)
        mrGetInfo = unsafeBitCast(getInfoSym, to: MRGetInfoFn.self)
        mrUnregister = unsafeBitCast(unregSym, to: MRUnregisterFn.self)

        // Register for push notifications on main queue
        mrRegister?(DispatchQueue.main)
        isUsingMediaRemote = true

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(self.handleNowPlayingChangedNotification(_:)),
                name: NSNotification.Name("kMRMediaRemoteNowPlayingInfoDidChangeNotification"),
                object: nil
            )

            // Initial query
            self.queryMediaRemote()

            // Health-check Watchdog: If no notifications arrive within 2.5s, probe AppleScript
            self.fallbackWatchdogTimer = Timer.scheduledTimer(withTimeInterval: 2.5, repeats: false) { [weak self] _ in
                guard let self = self else { return }
                if self.lastMediaRemoteTimestamp == 0 {
                    NSLog("[Cadence] MediaRemote silent on startup. Engaging dual AppleScript poller.")
                    self.startAppleScriptPoller(interval: 1.5)
                }
            }
        }
    }


    @objc private func handleNowPlayingChangedNotification(_ notification: Notification) {
        queryMediaRemote()
    }

    private func queryMediaRemote() {
        guard let getInfo = mrGetInfo else { return }

        getInfo(DispatchQueue.main) { [weak self] infoDict in
            guard let self = self else { return }

            guard let dict = infoDict as? [String: Any], !dict.isEmpty else {
                return
            }

            let title = dict["kMRMediaRemoteNowPlayingInfoTitle"] as? String ?? ""
            let artist = dict["kMRMediaRemoteNowPlayingInfoArtist"] as? String ?? ""
            let album = dict["kMRMediaRemoteNowPlayingInfoAlbum"] as? String ?? ""
            let duration = dict["kMRMediaRemoteNowPlayingInfoDuration"] as? Double ?? 0
            let elapsedTime = dict["kMRMediaRemoteNowPlayingInfoElapsedTime"] as? Double ?? 0
            let playbackRate = dict["kMRMediaRemoteNowPlayingInfoPlaybackRate"] as? Double ?? 0
            let isPlaying = playbackRate > 0

            var artworkUrl: String? = nil
            if let artworkData = dict["kMRMediaRemoteNowPlayingInfoArtworkData"] as? Data, !artworkData.isEmpty {
                let tempPath = NSTemporaryDirectory() + "cadence_art.jpg"
                let tempUrl = URL(fileURLWithPath: tempPath)
                if (try? artworkData.write(to: tempUrl)) != nil {
                    artworkUrl = "\(tempUrl.absoluteString)?t=\(Int(Date().timeIntervalSince1970))"
                }
            }


            if !title.isEmpty {
                self.lastMediaRemoteTimestamp = Date().timeIntervalSince1970

                let payload: [String: Any] = [
                    "active": true,
                    "source": "MediaRemote",
                    "title": title,
                    "artist": artist,
                    "album": album,
                    "duration": duration,
                    "position": elapsedTime,
                    "isPlaying": isPlaying,
                    "artworkUrl": artworkUrl ?? "",
                    "timestamp": Date().timeIntervalSince1970 * 1000
                ]
                self.updateCallback?(payload)
            }
        }
    }

    // MARK: - NSAppleScript Fallback Engine
    private func activateAppleScriptFallback(reason: String) {
        NSLog("[Cadence] Fallback active: \(reason)")
        isUsingMediaRemote = false
        startAppleScriptPoller(interval: 1.0)
    }

    private func startAppleScriptPoller(interval: TimeInterval) {
        if appleScriptTimer != nil { return }
        appleScriptTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            self?.pollAppleScript()
        }
        pollAppleScript()
    }

    private func pollAppleScript() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self, let script = self.compiledAppleScript else { return }

            var errorDict: NSDictionary?
            let descriptor = script.executeAndReturnError(&errorDict)

            if let result = descriptor.stringValue {
                let clean = result.trimmingCharacters(in: .whitespacesAndNewlines)

                DispatchQueue.main.async {
                    if clean.hasPrefix("OK|||") {
                        let parts = clean.components(separatedBy: "|||")
                        if parts.count >= 9 {
                            let source = parts[1]
                            let title = parts[2]
                            let artist = parts[3]
                            let album = parts[4]
                            let duration = Double(parts[5]) ?? 0
                            let position = Double(parts[6]) ?? 0
                            let state = parts[7]
                            let artUrl = parts[8]

                            let isPlaying = state.lowercased() == "playing"

                            let payload: [String: Any] = [
                                "active": true,
                                "source": source,
                                "title": title,
                                "artist": artist,
                                "album": album,
                                "duration": duration,
                                "position": position,
                                "isPlaying": isPlaying,
                                "artworkUrl": artUrl,
                                "timestamp": Date().timeIntervalSince1970 * 1000
                            ]
                            self.updateCallback?(payload)
                        }
                    }
                }
            }
        }
    }
}
