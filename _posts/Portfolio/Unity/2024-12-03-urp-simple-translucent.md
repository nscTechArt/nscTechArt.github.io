---
title: URP中的简易Translucent材质
date: 2024-12-03 09:48 +0800
categories: [Portfolio, Unity]
media_subpath: /assets/img/Portfolio/Unity/
math: false
---

美术提出想要一个具有透射效果的窗帘，类似The Last Of US第一代主菜单界面的效果：

![](tiffany-nguyen-tnguyen-main-menu-daytime.jpg)

### 实现思路

透射材质可以被划分为两类：

- Surface透射
- Volume透射

其中体积透射通常应用在云雾等效果上，这就是另一个较大的主题了。在常见材质中，我们所关注的是表面透射，也就是基于BTDF与BSSRDF。效果如下所示：

![](screenshot_translucency.png)

但是公司的项目物宅空间并不需要如此真实的材质效果，所以我实现了一版简单的透射。

