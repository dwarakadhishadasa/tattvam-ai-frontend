import { defineConfig } from "eslint/config";
import next from "eslint-config-next";

export default defineConfig([
  {
    ignores: [".agents/**", "_bmad/**", "**/.agents/**", "**/_bmad/**"],
  },
  {
    extends: [...next],
  },
]);
