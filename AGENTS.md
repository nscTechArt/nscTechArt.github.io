# AI Agent Instructions

This is a personal blog built on the [jekyll-theme-chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) theme. Language: **zh-CN**. Posts are primarily written in **Chinese**.

## Build Commands

```bash
./tools/run.sh        # Dev server with live reload (http://127.0.0.1:4000)
./tools/test.sh       # Production build (used for CI/deployment checks)
```

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
- Do **not** manually set `protected_by_folder_lock` or `folder_lock_scope` — set by `_plugins/post-visibility-filters.rb`

### Image Assets

Place images at `assets/img/<MainCategory>/<subcategory>/`. Set `media_subpath` in front matter to this path so images can be referenced by filename only.

## Custom Plugins

| Plugin | Purpose |
|--------|---------|
| `_plugins/posts-lastmod-hook.rb` | Reads `git log` to auto-populate `last_modified_at` for posts with >1 commits |
| `_plugins/post-visibility-filters.rb` | Provides `unlocked_posts` Liquid filter to hide protected posts from lists |

## Folder Lock System

Configured in `_config.yml` under `post_folder_lock`. Protects entire category paths with a client-side PIN. The `_includes/folder-lock-gate.html` renders the unlock form. Posts in locked folders are automatically excluded from feeds and lists via the `unlocked_posts` filter.

## Custom Includes

| Include | Usage |
|---------|-------|
| `folder-lock-gate.html` | Renders PIN unlock form; pass `card_id`, `input_id`, `button_id`, `msg_id`, `scope`, `password`, `title`, `description` |
| `post-tail.html` | Footer appended to each post |
| `related-posts.html` | Related post recommendations (scores by shared tags > shared categories) |
| `update-list.html` | Inline changelog / update history block |

## Layouts

All posts default to `layout: post` (set globally in `_config.yml` defaults). Tabs use `layout: page`. Available layouts: `home`, `post`, `archives`, `category`, `tag`, `tags`.

## Permalink Structure

Posts are served at `/posts/:title/` (`:title` = filename slug without date prefix).
