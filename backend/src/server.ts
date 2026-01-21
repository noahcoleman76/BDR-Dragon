import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`BDR Dragon backend running on port ${env.PORT}`);
});
