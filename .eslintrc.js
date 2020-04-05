module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "jest": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint",
        "prettier"
    ],
    "rules": {
        "prefer-template": "error",
        "no-multiple-empty-lines": [
            "error",
            {
                "max": 1
            }
        ],
        "no-console": "warn",
        "no-unused-vars": [
            "off"
        ],
        "linebreak-style": [
            "warn",
            "windows"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ],
        "curly": [
            "error",
            "all"
        ]
    }
};