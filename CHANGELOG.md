# RPC Anywhere

## 1.7.0

### Minor Changes

- a8a6c04: Fix: detect if iframes are already loaded.

## 1.6.0

### Minor Changes

- e76f323: Added iframe transport.
- e76f323: Updated demo to use the new iframe transport.
- e76f323: Improved README and added better examples.
- e76f323: Added worker transport.
- e76f323: Added broadcast channel transport.
- e76f323: Improved documentation.
- e76f323: Improved the `createTransportFromMessagePort` API.

## 1.5.0

### Minor Changes

- db13394: Publish CJS version.

## 1.4.0

### Minor Changes

- fefe796: Fixed message port transport.
- fefe796: Added debug hooks for logging and debugging.
- 14c38f9: Support "void" in RPCSchema, useful for inferring from request handler when there are no messages.
- fefe796: Added a cool demo!
- 14c38f9: Updated and improved documentation.

### Patch Changes

- fefe796: Better naming for low-level message types.
- 14c38f9: Improve test coverage.
- fefe796: Reduced chance of colision for the transport id key.

## 1.3.4

### Patch Changes

- 4046d0b: Fix: transport utils - ID and filter exclusivity check.

## 1.3.3

### Patch Changes

- 1c92feb: Fix: createTransportFromBrowserRuntimePort send function will actually send now.

## 1.3.2

### Patch Changes

- 2e447f8: Fix: better filter type for `createTransportFromBrowserRuntimePort`'s `filter` option.

## 1.3.1

### Patch Changes

- 4058d02: Fix: better browser runtime port transport port type.

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
