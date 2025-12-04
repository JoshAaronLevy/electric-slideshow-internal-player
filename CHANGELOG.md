# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-04
### Added
- Configured the Electron main process with a dedicated "Electric Slideshow Internal Player" window, lifecycle logging, and safer load handling.
- Introduced the INTERNAL_PLAYER API surface, Spotify Web Playback SDK wrapper, and typed status store for DevTools access.
- Built a live React status dashboard with manual token input, exposing connection state, device ID, track info, and inline error feedback.
