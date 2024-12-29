---
title: URP中实现Dual Kawase Blur
date: 2024-12-17 21:29 +0800
categories: [Unity, Rendering]
tags: [Unity, Blur]
media_subpath: /assets/img/Unity/24-12-17/
math: true
---

{% include embed/video.html src='{01.mp4}' poster='20241230010044.png' %}

Dual Blur框架本质上是利用分层处理的思想：

- 在**降采样**过程中降低图像分辨率，减少处理的像素数量，从而实现高效的模糊效果
- 在**升采样**过程中逐级叠加模糊结果，产生一种更自然、更扩散的模糊效果

Dual Blur支持多种模糊算法作为基础（例如Kawase模糊、高斯模糊等），框架本身不限制具体的模糊操作。

在Dual Kawase Blur算法中，降采样与升采样会使用不同的blur kernel，如下图所示：

![](v2-1ae54eb0e154d542ff6acdae06232bdc_1440w.png)

下面这些文章都更详细地介绍了这种模糊算法：

- [十种图像模糊算法的总结与实现-腾讯云开发者社区-腾讯云](https://cloud.tencent.com/developer/article/1614858)
- [Unity URP DualKawaseBlur tajourney](https://tajourney.games/5050/)
- [An investigation of fast real-time GPU-based image blur algorithms](https://www.intel.com/content/www/us/en/developer/articles/technical/an-investigation-of-fast-real-time-gpu-based-image-blur-algorithms.html)

---

### 连续的模糊算法

虽然多级降采样与升采样能够带来性能上的明显优势，但会带来一些问题，即由于降采样与升采样本身而产生的模糊与我们希望的“精确控制的模糊效果”之间存在差异。具体来说：

- 降采样会丢失图像中的高频细节，导致“模糊”
- 升采样时，模糊算法会在不同分辨率的纹理之间进行过渡，可能最终使得模糊效果存在阶跃式的视觉瑕疵，导致丢失过多细节或模糊效果分布不均

所以常规的dual kawase blur算法的实现对于逐渐模糊的效果需求是不太友好的。

如何解决呢？在原始分辨率下直接完成模糊操作，可以避免降采样和升采样带来的“不理想”模糊，但就违背使用Dual Blur算法的初衷。但是这种思路能够启发我们，最终使用的解决方法是，**在升采样过程中，通过调整权重参数$\alpha$（介于0到1之间）进行线性插值，平滑地融合两个纹理的模糊程度，从而让模糊效果在不同迭代次数之间保持连续过渡**

> 本篇博客在一定程度上参考了这篇[文章](https://zznewclear13.github.io/posts/almost-continuous-dual-kawase-blur/)，感谢zznewclear13前辈

#### 模糊半径

在常规的dual blur算法中，我们会指定模糊半径、迭代次数以及降采样的倍率。在这种做法下，模糊强度与模糊参数成线性比例，那么模糊程度的变化就会较为剧烈，无法生成连续的模糊效果。在我们的实现中，使用了以2为底的对数调整模糊程度的动态范围：

```c#
float blurAmount = Mathf.Log(maxRadius * intensity + 1.0f, 2);
int   blurIterations = Mathf.FloorToInt(blurAmount);
```

对数函数具有增长速度逐渐减缓的特性，这种非线性增长方式使得模糊效果变化在低值时更明显，在高值时更加平缓。符合我们的需求。

而在升采样与降采样过程中，采样点的偏移始终由blur kernel以及目标纹理的分辨率决定。

#### 线性插值

线性插值是实现连续的模糊效果的关键。前面我们已经提到了线性插值的作用，现在我们需要弄明白其中的一些细节问题：

- 如何确定插值的权重？
- 线性插值发生在升采样过程中，那么具体是在哪两个特定的纹理之间插值？
- 为什么通过插值可以实现连续的模糊效果？

我们来逐一解释。首先，插值的权重为`blurAmount - blurIterations`，也就是`blurAmount`的小数部分，这样权重始终在$[0, 1]$的范围内，并且在本质上就是代表趋近下一个模糊层级的程度。

在dual blur算法框架中，当降采样模糊的完成后，就要开始执行升采样模糊。在完成第一次升采样后，我们将得到的纹理与降采样过程中的与其分辨率一致的纹理进行插值，实际上也就是倒数第二次的降采样纹理。

![](20241230005335.png)

想要理解为什么插值能够实现连续的模糊效果，我们需要思考这个问题的本质：**插值如何影响了两个相邻迭代层级之间的模糊效果**。我们不妨使用一个笨方法，找一个简单的例子推导一遍算法，并考虑极端的插值权重。简单起见，我们分别来看迭代次数为1与迭代次数为2的情况。

##### Case 1

`blurIteration`为`1`，则算法流程为：

降采样

- cameraColor -> texture0
- texture0 -> texture1

升采样

- texture1 -> texture2

插值

- texture0 -> texture2

交换

- texture0 <-> texture2 

升采样

- texture0 -> finalTexture

在插值权重无限趋近于1时，**texture0**本质上就是**texture2**，即**texture1**升采样的结果。那么整个模糊过程就等价于**两次降采样+两次升采样**，也就是：

降采样

- cameraColor -> texture0
- texture0 -> texture1

升采样

- texture1 -> texture0

- texture0 -> finalTexture

##### Case 2

`blurIteration`为`2`，则算法流程为：

降采样

- cameraColor -> texture0
- texture0 -> texture1
- texture1 -> texture2

升采样

- texture2 -> texture3

插值

- texture1 -> texture3

交换

- texture1 <-> texture3

升采样

- texture1 -> texture0
- texture0 -> finalTexture

在插值权重无线趋近于0时，相当于我们忽略掉了由**texture2**升采样得到的**texture3**，那么整个模糊过程就等价于**两次降采样+两次升采样**，也就是：

降采样

- cameraColor -> texture0
- texture0 -> texture1

升采样

- texture1 -> texture0
- texture0 -> finalTexture

由此，我们不难归纳出这样的结果：**当模糊算法的迭代次数递进时，用于插值的权重从1变为0，从而衔接起两个相邻迭代次数之间的模糊程度，实现连续的模糊效果。**

