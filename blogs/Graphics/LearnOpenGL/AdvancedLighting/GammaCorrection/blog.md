---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/AdvancedLighting/GammaCorrection/index.html
title: GammaCorrection
---

### Gamma Correction

---

原文中关于理论的阐述我还是不懂，就暂时跳过吧，直接来看OpenGL中代码相关的内容。

在OpenGL中，实现伽马校正有两种途径：

- 使用OpenGL内置的sRGB framebuffer支持
- 我们在片段着色器中自行完成伽马校正的计算

第一种方法，我们只需要一行代码

```
glEnable(GL_FRAMEBUFER_SRGB);
```

