---
title: URP中实现Dual Kawase Blur
date: 2024-12-17 21:29 +0800
categories: [Unity, Rendering]
tags: [Unity, Blur]
media_subpath: /assets/img/Portfolio/Unity
math: true
---

Dual Blur框架本质上是利用分层处理的思想：

- 在**降采样**过程中降低图像分辨率，减少处理的像素数量，从而实现高效的模糊效果
- 在**升采样**过程中逐级叠加模糊结果，产生一种更自然、更扩散的模糊效果

Dual Blur支持多种模糊算法作为基础（例如Kawase模糊、高斯模糊等），框架本身不限制具体模糊操作。框架本身不限制具体的模糊操作。

在Dual Blur中，模糊范围$R$可以通过以下方式控制：

- 降采样的级数$L$：更大的降采样会让模糊范围增大
- 模糊核的大小$K$：影响每一级模糊效果的细腻程度

所以在公式上，模糊范围近似满足：


$$
R=2^L\cdot K
$$

---

虽然多级降采样与升采样能够带来性能上的明显优势，但会带来一些问题，即由于降采样与升采样本身而产生的模糊与我们希望的“精确控制的模糊效果”之间存在差异。具体来说：

- 降采样会丢失图像中的高频细节，导致模糊
- 升采样时，模糊算法会在不同分辨率的纹理之间进行过渡，可能最终使得模糊效果存在阶跃式的视觉瑕疵，导致丢失过多细节或模糊效果分布不均

如何解决呢？在原始分辨率下直接完成模糊操作，可以避免降采样和升采样带来的“不理想”模糊，但就违背使用Dual Blur算法的初衷。另一种解决方法是，通过插值方法，从不同模糊层级之间生成更精确的结果。这种方式性能较高，同时可以通过调节参数，控制模糊效果。

本篇博客的实现中很大程度上参考了这篇[文章](https://zznewclear13.github.io/posts/almost-continuous-dual-kawase-blur/)。

---

在升采样与降采样过程中，采样点的偏移始终是由目标纹理的分辨率决定的。整个模糊算法的模糊程度是由最大模糊半径与模糊强度两个参数共同决定的：

```c#
float blurAmount = Mathf.Log(maxRadius * intensity + 1.0f, 2);
```

其中intensity的范围为$[0, 1]$。我们取整数部分，就得到了模糊算法的降采样次数。这样的话，我们可以计算出一个值，表示当前层级的模糊接近下一层级的程度：

```
int blurIterations
```

---

blurIterations = 1，**这里假设插值程度为1**

降采样

- cameraColor -> texture0
- texture0 -> texture1

升采样

- texture1 -> texture2

插值

- texture0 -> texture2

交换

- texture2 -> texture0

升采样

- texture0 -> finalTexture

由于插值程度为1，texture2本质上就是texture1，那么整个模糊过程就可以简化为：

降采样

- cameraColor -> texture0
- texture0 -> texture1

升采样

- texture1 -> texture0

- texture0 -> finalTexture

整个过程存在**两次**降采样，**两次**升采样。

---

blurIterations = 2，**这里假设插值程度为0**

降采样

- cameraColor -> texture0
- texture0 -> texture1
- texture1 -> texture2

升采样

- texture2 -> texture3

插值

- texture1 -> texture3

交换

- texture3 -> texture1

升采样

- texture1 -> texture0
- texture0 -> finalTexture

由于插值程度为0，**texture3**在本质上就是**texture1**，那么整个模糊过程就可以简化为：

降采样

- cameraColor -> texture0
- texture0 -> texture1

升采样

- texture1 -> texture0
- texture0 -> finalTexture

整个过程存在**两次**降采样，**两次**升采样。

---

比较两种情况，我们可以归纳出，当模糊算法的迭代次数加一时，用于插值的参数从1变为0，从而衔接起两个相邻迭代次数之间的模糊程度，实现连续的模糊效果。
