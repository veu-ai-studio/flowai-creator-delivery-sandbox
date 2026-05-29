import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ignores: ["src/lib/**/*", "src/components/ui/**/*"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",

      // ADR 0001 — No hardcoded product lists. New surfaces must read from
      // /api/products via src/lib/products/registry.js. Existing legacy
      // surfaces are allowlisted in the override block below until UX-3
      // retires them. See docs/adr/0001-no-hardcoded-products.md.
      "no-restricted-syntax": [
        "error",
        {
          // Narrowed per peer feedback (2026-05-09): targeting only the
          // ADR-named identifiers, not generic `PRODUCTS`. Generic arrays
          // named PRODUCTS in non-product contexts no longer false-positive.
          selector:
            "VariableDeclarator[id.name=/^(VEU_PRODUCTS|HARDCODED_PRODUCTS)$/][init.type='ArrayExpression']",
          message:
            "ADR 0001: do not hardcode a top-level VEU_PRODUCTS array. Read products at runtime via src/lib/products/registry.js (listProducts). If you genuinely need this in a legacy file, add the file to the allowlist in eslint.config.js with a comment linking to docs/adr/0001-no-hardcoded-products.md.",
        },
        {
          // Hardened per peer feedback (2026-05-09): also catches imports
          // that include an explicit file extension to prevent trivial
          // `'@/lib/veuProducts.js'` bypass.
          selector:
            "ImportDeclaration[source.value=/.*lib\\/veuProducts(\\.(js|mjs|cjs|jsx|ts|tsx))?$/]",
          message:
            "ADR 0001: do not import from @/lib/veuProducts. Read products at runtime via src/lib/products/registry.js. If you're working on a legacy GTM / DemoGenerator surface, add the file to the allowlist in eslint.config.js.",
        },
      ],
    },
  },
  // ADR 0001 — Allowlist for legacy hardcoded-product surfaces. Retire each
  // entry as its surface migrates to the registry helper (UX-3 follow-up).
  // See docs/adr/0001-no-hardcoded-products.md.
  {
    files: [
      "src/components/marketplace/AIRecommendationPanel.jsx",
      "src/pages/Architecture.jsx",
      "src/pages/BrandSystem.jsx",
      "src/pages/CapabilityInstallSelfProtection.jsx",
      "src/pages/CapabilityInstallSelfRenewal.jsx",
      "src/pages/Clearance.jsx",
      "src/pages/CostUsage.jsx",
      "src/pages/DataExport.jsx",
      "src/pages/DemoGenerator.jsx",
      "src/pages/DomainManager.jsx",
      "src/pages/Environments.jsx",
      "src/pages/GTMAssets.jsx",
      "src/pages/InvestorStudio.jsx",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];
