import { css } from "./styled-system/css/index.js";

css({ color: "primary", display: "flex" });

// @ts-expect-error Panda must reject semantic tokens outside the contract.
css({ color: "brand-typo" });

// @ts-expect-error Panda must reject invalid CSS property values.
css({ display: "banana" });
