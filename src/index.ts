import * as core from "@actions/core";
import * as github from "@actions/github";

try {
    console.log("hello");
} catch (error) {
    core.setFailed(error.message);
}