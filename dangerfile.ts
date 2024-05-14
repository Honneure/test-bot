import { danger, markdown, schedule, warn } from "danger";
import todos from "danger-plugin-todos";

function getMdSection(category: string, message: string) {
  return `# ${category} <br>${message}`;
}

// Check if package.json was changed, but not yarn.lock
const packageChanged = danger.git.modified_files.find((x) =>
  x.includes("package.json")
);
const lockfileChanged = danger.git.modified_files.find((x) =>
  x.includes("yarn.lock")
);
if (packageChanged && !lockfileChanged) {
  const message = "Changes were made to package.json, but not to yarn.lock";
  const idea = "Perhaps you need to run `yarn install`?";
  warn(`${message} - <i>${idea}</i>`);
}

// Check if .env.example was changed, but not environment variable documentation
const envChanged =
  danger.git.modified_files.find((x) => x.includes(".env.example")) ||
  danger.git.modified_files.find((x) => x.includes("environment.service.ts"));
const envDocsChanged = danger.git.modified_files.includes("self-hosting.mdx");
if (envChanged && !envDocsChanged) {
  const message =
    "Changes were made to the environment variables, but not to the documentation";
  const idea =
    "Please review your changes and check if a change needs to be documented!";
  warn(`${message} - <i>${idea}</i>`);
}

// CLA alert if first time contributor
if (
  danger.github &&
  danger.github.pr &&
  (danger.github.pr.author_association === "FIRST_TIME_CONTRIBUTOR" ||
    danger.github.pr.author_association === "NONE")
) {
  markdown(
    getMdSection(
      "Welcome!",
      `
Hello there, congrats on your first PR! We're excited to have you contributing to this project.
By submitting your Pull Request, you acknowledge that you agree with the terms of our [Contributor License Agreement](https://github.com/twentyhq/twenty/blob/main/.github/CLA.md).`
    )
  );
}

if (danger.github && danger.github.pr.merged) {
  const pullRequest = danger.github.pr;
  const userName = pullRequest.user.login;

  const ordinalSuffix = (number) => {
    const v = number % 100;
    if (v === 11 || v === 12 || v === 13) {
      return number + "th";
    }
    const suffixes = { 1: "st", 2: "nd", 3: "rd" };
    return number + (suffixes[v % 10] || "th");
  };

  async function fetchContributorStats(username) {
    const apiUrl = `https://twenty.ngrok.app/api/contributors/contributorStats/${username}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching contributor stats:", error);
      throw error;
    }
  }

  async function fetchContributorImage(username) {
    const apiUrl = `https://twenty.ngrok.app/api/contributors/${username}/og.png`;

    try {
      const response = await fetch(apiUrl);
    } catch (error) {
      console.error("Error fetching contributor image:", error);
      throw error;
    }
  }

  async function run() {
    try {
      const { data: pullRequests } =
        await danger.github.api.rest.search.issuesAndPullRequests({
          q: `is:pr author:${userName} is:closed repo:ady-beraud/test-bot`,
          per_page: 2,
          page: 1,
        });

      let stats;
      const isFirstPR = pullRequests.total_count === 1;

      if (!isFirstPR) {
        stats = await fetchContributorStats(userName);
      } else {
        stats = { mergedPRsCount: 1, rank: 52 };
      }

      const contributorUrl = `https://twenty.com/contributors/${userName}`;

      // Pre-fetch to trigger cloudflare cache
      await fetchContributorImage(userName);

      const message =
        `Thanks @${userName} for your contribution!\n` +
        `This marks your **${ordinalSuffix(
          stats.mergedPRsCount
        )}** PR on the repo. ` +
        `You're **top ${stats.rank}%** of all our contributors 🎉\n` +
        `[See contributor page](${contributorUrl}) - ` +
        `[Share on LinkedIn](https://www.linkedin.com/sharing/share-offsite/?url=${contributorUrl}) - ` +
        `[Share on Twitter](https://www.twitter.com/share?url=${contributorUrl})\n\n` +
        `![Contributions](https://twenty.ngrok.app/api/contributors/${userName}/og.png)`;

      await danger.github.api.rest.issues.createComment({
        owner: danger.github.thisPR.owner,
        repo: danger.github.thisPR.repo,
        issue_number: danger.github.thisPR.pull_number,
        body: message,
      });
    } catch (error) {
      console.error("Failed to handle PR merge:", error);
    }
  }

  run();
}

// TODOS / Fixme
schedule(todos());
