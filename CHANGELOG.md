# RPC Anywhere

## 1.3.0

### Minor Changes

- df6222f: Added transport identification options to browser runtime port transport.
- df6222f: Merged `request` and `requestProxy` into `request`.
- df6222f: Added transport utils to simplify the creation of identifiable transports.
- df6222f: Refactored from class to functions.

  - `new RPC()` -> `createRPC()`
  - `RPC.asClient()` -> `createClientRPC()`
  - `RPC.asServer()` -> `createServerRPC()`

- df6222f: Added proxy API for message sending.
- df6222f: New feature: transport bridges.
- df6222f: Centralized transport methods in transport object.
- df6222f: Added `proxy` property.
- df6222f: Added message port transport (iframes, window objects, service workers, etc)
- df6222f: Added `requestProxy` and `sendProxy` with "just the proxy" types.
- df6222f: Greatly improved type safety: schema dependent methods and options.

### Patch Changes

- df6222f: Improved documentation.
- df6222f: Added (very!) exhaustive type tests.
- df6222f: Added JSDoc tests.
- df6222f: Fix: invalid message payload type inference.
- df6222f: Improved unit tests.

## 1.2.0

### Minor Changes

- f9d8b76: Improved types, including a fix that caused errors in correct request handlers when the request was defined as "void" in the schema.

### Patch Changes

- f9d8b76: Bumped dependencies to latest.

## 1.1.0

### Minor Changes

- 63d54c9: Added JSDoc comments everywhere.

## 1.0.0

### Major Changes

- 708a3b3: Initial release.
