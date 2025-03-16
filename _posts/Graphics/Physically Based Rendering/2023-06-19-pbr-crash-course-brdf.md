---
title: Crash Course in BRDF Implementation
date: 2023-06-19 14:57 +0800
categories: [Graphics, Physical Based Rendering]
media_subpath: /assets/img/Graphics/PhysicallyBasedRendering/
math: true
---

> 本篇博客翻译自[Crash Course in BRDF Implementation.docx](https://boksajak.github.io/files/CrashCourseBRDF.pdf)

### 1 Introduction

在本篇博客中，我们将会介绍游戏领域中常用的一些基础BRDF的实现，以及它们背后的原理。

---

### 2 So, What is the BRDF?

BRDF的意义在于，对给定给的入射光有
