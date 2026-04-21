# AI Agent Instructions

This is a personal blog built on the [jekyll-theme-chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) theme. Language: **zh-CN**. Posts are primarily written in **Chinese**.

## Build Commands

```bash
./tools/run.sh        # Dev server with live reload (Docker/container-preferred)
./tools/test.sh       # Production build (CI/Docker validation only)
```

## Environment Notes

- This project uses Bundler-based Jekyll workflow. Prefer running the two scripts above instead of ad-hoc `jekyll` commands.
- This repo is typically run inside Docker. In local host environments, agents should not plan around running `./tools/run.sh` or `./tools/test.sh`.
- Unless explicitly requested by the user (or the agent is confirmed to run inside the project's Docker environment), skip both scripts and rely on non-runtime checks.
- If build fails with `bundler: command not found: jekyll` or Ruby dependency conflicts, check local Ruby version first.
- `html-proofer ~> 5.0` requires Ruby `>= 3.1`; macOS system Ruby 2.6 is not sufficient for full build/test.
- Keep timezone-sensitive content aligned with site config (`Asia/Shanghai`) and post dates using `+0800`.

Recommended command order for agents:
1. Do static/file-level validation first (front matter, paths, links, category-folder consistency)
2. `./tools/run.sh` only when user explicitly asks, or when running in the project's Docker environment
3. `./tools/test.sh` only when user explicitly asks, or when running in the project's Docker/CI environment

## Post Conventions

### File Location & Naming

Posts live under `_posts/<MainCategory>/<Subcategory>/YYYY-MM-DD-kebab-case-title.md`.

Current category hierarchy:
- `AI/AnthropicCourses`
- `Blender/Tools`
- `Graphics/` → Build A Soft Rasterizer, collections, Physically Based Rendering, Ray Tracing Book Series, rtr 4th, Scratchapixel, vulkan collections
- `MentalSpa/` → Connections, Insides, Trajectory
- `Psychology/Notes`
- `Unity/Rendering`

### Front Matter Template

```yaml
---
title: Post Title Here
date: YYYY-MM-DD HH:MM +0800
categories: [MainCategory, Subcategory]
media_subpath: /assets/img/MainCategory/subcategory/
math: false        # set true only for posts with LaTeX equations
tags: [tag1, tag2] # optional
---
```

Key rules:
- `date` **must** use `+0800` offset (Asia/Shanghai timezone)
- `categories` is always a two-element array `[Main, Sub]` matching the folder path
- `media_subpath` enables bare filenames in image references: `![](image.png)` instead of full paths
- `math: true` enables MathJax; omit or set `false` when not needed
- Do **not** manually set `last_modified_at` — the `_plugins/posts-lastmod-hook.rb` reads it from git history automatically

### Image Assets

Place images at `assets/img/<MainCategory>/<subcategory>/`. Set `media_subpath` in front matter to this path so images can be referenced by filename only.

## Custom Plugins

| Plugin | Purpose |
|--------|---------|
| `_plugins/posts-lastmod-hook.rb` | Reads `git log` to auto-populate `last_modified_at` for posts with >1 commits |

## Custom Includes

| Include | Usage |
|---------|-------|
| `post-tail.html` | Footer appended to each post |
| `related-posts.html` | Related post recommendations (scores by shared tags > shared categories) |
| `update-list.html` | Inline changelog / update history block |

## Layouts

All posts default to `layout: post` (set globally in `_config.yml` defaults). Tabs use `layout: page`. Available layouts: `home`, `post`, `archives`, `category`, `tag`, `tags`.

## Permalink Structure

Posts are served at `/posts/:title/` (`:title` = filename slug without date prefix).
