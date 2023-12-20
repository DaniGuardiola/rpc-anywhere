/* eslint-disable @typescript-eslint/no-unused-vars */
import { createRPC } from "../create-rpc.js";
import { type RPCSchema } from "../types.js";

/* IMPORTANT: this test is NOT automatic.

Instead, it must be checked manually by accessing the generated documentation for each relevant symbol (e.g. by hovering over them
in Visual Studio Code) and comparing.

Each line with symbols to check has a comment below pointing to
them with a repeated caret symbol (^). For example: */

/**
 * Example JSDoc test.
 *
 * @see https://example.jsdoc.test/
 */
const example = 1234;
console.log(example);
//          ^^^^^^^

/* When you encounter this, verify that the displayed documentation
is correct. Make sure to read the comments with additional
instructions too.

The tests are successful if all docs show up as expected. */

// ------------------------------

// |------------------|
// | TESTS START HERE |
// |------------------|

const rpc = createRPC<Schema>();

// ALL docs should have a matching @example or @see.

const response1 = await rpc.request("method1", { paramA: 1234 });
//                                               ^^^^^^
response1.propA;
//        ^^^^^
const response1Proxy = await rpc.request.method1({ paramA: 1234 });
//                                       ^^^^^^^   ^^^^^^
response1Proxy.propA;
//             ^^^^^
rpc.request.method2();
//          ^^^^^^^
rpc.send("message1", { propertyA: "hello" });
//                     ^^^^^^^^^
rpc.send.message1({ propertyA: "hello" });
//       ^^^^^^^^   ^^^^^^^^^
rpc.addMessageListener("message1", ({ propertyA }) => {
  //                                  ^^^^^^^^^
  propertyA;
});
rpc.send.message2();
//       ^^^^^^^^

// |------------------|
// |  TESTS END HERE  |
// |------------------|

// ------------------------------

type Schema = RPCSchema<{
  requests: {
    /**
     * method1 description
     *
     * @example
     *
     * ```
     * method1 example
     * ```
     */
    method1: {
      params: {
        /**
         * method1 -> paramA description
         *
         * @see https://param.a/
         */
        paramA: number;
      };
      response: {
        /**
         * method1 -> response propA description
         *
         * @see https://response.prop.a/
         */
        propA: string;
      };
    };
    /**
     * method2 description
     *
     * @example
     *
     * ```
     * method2 example
     * ```
     */
    method2: void;
  };
  messages: {
    /**
     * message1 description
     *
     * @example
     *
     * ```ts
     * message1 example
     * ```
     */
    message1: {
      /**
       * message1 -> payload propertyA description
       *
       * @see https://payload.property.a/
       */
      propertyA: string;
    };
    /**
     * message2 description
     *
     * @example
     *
     * ```ts
     * message2 example
     * ```
     */
    message2: void;
  };
}>;
