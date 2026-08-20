import { base } from "@project-intelligence/eslint-config";

export default [
  ...base,
  {
    ignores: ["node_modules/**", "dist/**"],
  },
];
