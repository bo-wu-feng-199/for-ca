# @for-ca/core

Multi-currency cash change engine. Zero dependencies.

```js
import { calculate } from "@for-ca/core";

const r = calculate(23.47, 100, "USD");
// { status: "settled", balance: 76.53, plans: [...] }
```

**Currencies:** USD, EUR, JPY, CNY.
