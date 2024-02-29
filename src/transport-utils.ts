const transportIdKey = "[transport-id]";

/**
 * Common options for a transport.
 */
export type RPCTransportOptions = {
  /**
   * An optional unique ID to use for the transport. Useful in cases where
   * messages are sent to or received from multiple sources, which causes
   * issues.
   */
  transportId?: string | number;

  /**
   * A filter function that determines if a message should be processed or
   * ignored. Like the `transportId` option, but more flexible to allow for
   * more complex use-cases.
   */
  filter?: () => boolean | undefined;
};

/**
 * Wraps a message in a transport object, if a transport ID is provided.
 */
export function rpcTransportMessageOut(
  data: any,
  options: Pick<RPCTransportOptions, "transportId">,
) {
  const { transportId } = options;
  if (transportId != null) return { [transportIdKey]: transportId, data };
  return data;
}

/**
 * Determines if a message should be ignored, and if not, returns the message
 * too. If the message was wrapped in a transport object, it is unwrapped.
 */
export function rpcTransportMessageIn(
  message: any,
  options: RPCTransportOptions,
): [ignore: false, message: any] | [ignore: true] {
  const { transportId, filter } = options;
  const filterResult = filter?.();
  if (transportId != null && filterResult != null)
    throw new Error(
      "Cannot use both `transportId` and `filter` at the same time",
    );

  let data = message;
  if (transportId) {
    if (message[transportIdKey] !== transportId) return [true];
    data = message.data;
  }
  if (filterResult === false) return [true];
  return [false, data];
}

/**
 * Determines if a message should be ignored, and if not, returns the message
 * too. If the message was wrapped in a transport object, it is unwrapped.
 */
export function rpcTransportMessageInLite(
  message: any,
  transportId?: string | number,
): [ignore: false, message: any] | [ignore: true] {
  let data = message;
  if (transportId) {
    if (message[transportIdKey] !== transportId) return [true];
    data = message.data;
  }
  return [false, data];
}
