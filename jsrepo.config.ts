import { defineConfig } from "jsrepo";

export default defineConfig({
  registries: ["https://reactbits.dev/r/{name}.json"],
  paths: {
    component: 'src/components/reactbits',
  },
});
