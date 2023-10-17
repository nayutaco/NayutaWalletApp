# Contributing to Nayuta Wallet

## Issues

Issues are used to track tasks, for example:

- Fix typo
- User interface improvements
- Found bugs
- Todos
- Other discussion
- Miscellaneous

## Branches

We follow the flow based on GitLab flow.  
You can find more details about GitLab flow [here](https://github.com/jadsonjs/gitlab-flow).  
We choose GitLab flow over GitHub flow because we cannot release the code immediately after merging it into the main branch, as we do with web apps.
The production branch in GitLab flow is particularly helpful for managing the release of mobile apps.

- `main`
  - It contains latest developing code.
  - Do not directly commit.
- feature branches (prefixed with `feature/`)
  - It is used to implement new feature.
  - Fork from `main` for each feature.
  - Create Pull Request targeting to `main`
- bugfix branches (prefixed with `bugfix/`)
  - It is used when you fix bugs.
  - Fork from `main` for each fix.
  - Create Pull Request targeting to `main`
- release branches (it looks like `release/<os-type>-vX.Y.Z`)
  - It is used to prepare release including:
    - updating update message
    - changing version code
  - Fork from `main` for each release.
- `production`
  - It contains the code released to the production

## Development flow

1. Create Issue and add it to milestone.
1. Create branch from `main` with short, simple but descriptive name.
1. Create PR and request review.

## Internal Release flow

* Create branch from `main` and prefix it with `release/`
* Bump version
  * NC2
    * Update android/app/build.gradle
      * `versionCode`
      * `versionName`
        * Use pre-release versioning. e.g. `1.0.0-beta.1`
    * misc/update_info.ts
      * Contents update in each language
  * NC2-ApiServer (Optional)
    * data/updateInfo_android.json
* Build Android aab
* Go to Google Play Console and publish to internal test

### Make fix during the release flow
You may need to make fixes after creating the release branch.  
Follow this steps.  

* Create a branch from the release branch
* Make the changes and merge them into `main` first. Then cherry-pick or merge the changes into the release branch.


## Release flow

* Bump version in release branch
  * NC2
    * android/app/build.gradle
      * `versionCode`
      * `versionName`
* Merge release branch to production branch
* Create tag `<os-type>-vX.Y.Z` in production branch
* Build Android aab
* Go to Google Play Console and publish

## Hotfix flow
When an urgent release, such as important bug fixes, is needed, we follow the hotfix flow.   

* Create a hotfix branch from the latest tag in the production branch. Prefix it with hotfix/.
* Create a release branch from the latest tag in the production branch. Prefix it with `release/`
* Make the changes in the hotfix branch and merge them into `main`.
* Cherry-pick or merge the changes into the release branchs. Don't forget to include fixes to **all** release branchs.
* Follow usual release flow.
