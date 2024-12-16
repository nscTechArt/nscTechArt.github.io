---
title: Pratical Implement 
date: 2024-08-04 23:59 +0800
categories: [Graphics, Build A Soft Rasterizer]
media_subpath: /assets/img/Graphics/MySoftRasterizer/
math: true
---

### Optimizing the Edge Function

我们首先回顾一下edge function的实现：

```c++
float edgeFunction(const Vec2 &a, const Vec2 &b, const Vec2 &c) {
    return (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
}
```

其中，$a$和$b$表示三角形的其中两个顶点，而$c$表示栅格空间中像素的坐标。我们思考一下，在光栅化中，我们会为三角形bounding box中的每个像素调用edge function，而在每次调用时，只有$c$是改变的，$a$和$b$始终保持不变。

如果我们执行一次计算，计算结果记作$w0$：

```c++
w0 = (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
```

如果`c[0]`在每次循环中递进$s$，则有：

```c++
w0_new = (c[0] + s - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
```

我们将两个式子相减，可得：

```c++
w0_new - w0 = s * (b[1] - a[1]);
```

对于当前三角形来说，`s * (b[1] - a[1])`是一个定值，那么我们就可以预先计算，并记为`w0_step`，从而在很大程度上降低了运算量：

```c++
w0_new = w0 + w0_step;
```

---

![](vertex-transform-pipeline.png)
