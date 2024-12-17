---
title: URP中实现Dual Kawase Blur
date: 2024-12-17 21:29 +0800
categories: [Portfolio, Unity]
tags: [Unity, Blur]
media_subpath: /assets/img/Portfolio/Unity
---

Dual Blur本质上是利用分层处理的思想：

- 在**降采样**过程中降低图像分辨率，减少处理的像素数量，从而实现高效的模糊效果
- 在**升采样**过程中逐级叠加模糊结果，产生一种更自然、更扩散的模糊效果

Dual Blur支持多种模糊算法作为基础（例如Kawase模糊、高斯模糊等），框架本身不限制具体模糊操作。框架本身不限制具体的模糊操作。

在Dual Blur中，模糊范围$R$可以通过以下方式控制：

- 降采样的级数（L）：更大的降采样会让模糊范围增大
- 模糊核的大小（K）：影响每一级模糊效果的细腻程度

所以在公式上，模糊范围近似满足：


$$
R=2^L\cdot K
$$

---

虽然多级降采样与升采样能够带来性能上的明显优势，但会带来一些问题，即由于降采样与升采样本身而产生的模糊与我们希望的“精确控制的模糊效果”之间存在差异。具体来说，降采样会丢失图像中的高频细节，导致模糊；升采样可能带来插值伪影，影响最终图像的平滑感。这种模糊在一定程度上来说并不是我们可以精确控制的，可能最终使得模糊效果丢失过多细节或分布不均。

在原始分辨率下直接完成模糊操作，可以避免了降采样/升采样的模糊，但就违背使用Dual Blur算法的初衷。另一种解决方法是，通过插值方法，从不同模糊层（例如零次和一次模糊）之间生成更精确的结果。这种方式性能较高，同时可以通过调节参数，控制模糊效果。

本篇博客的实现中很大程度上参考了这篇[文章](https://zznewclear13.github.io/posts/almost-continuous-dual-kawase-blur/)。但是我目前不理解，“连续”的模糊效果是如何实现出来的。

---

假如`DownSampleCount = 1`，那么算法的流程如下：

- 进入降采样循环前
  - 创建`_KawaseRT`
  - ID-List：`_KawaseRT`
  - Size-List：`3840 x 2160`

##### 降采样循环

- i = 0
  - 创建`_KawaseRT0`
  - ID-List：`_KawaseRT`、`_KawaseRT0`
  - Size-List：`3840 x 2160` 、`1920 x 1080`
  - 将`_CameraColorTexture`降采样模糊到`_KawaseRT0`
- i = 1
  - 创建`_KawaseRT1`
  - ID-List：`_KawaseRT`、`_KawaseRT0`、`_KawaseRT1`
  - Size-List：`3840 x 2160` 、`1920 x 1080`、`960 x 540`
  - 将`_KawaseRT0`降采样模糊到`_KawaseRT1`

##### 结束降采样循环

创建`_KawaseRT2`，大小为`1920 x 1080`

- source = `_KawaseRT1`
- destination = `_KawaseRT2`
- 从 `_KawaseRT1`升采样模糊到 `_KawaseRT2`
- 对`_KawaseRT0`和`_KawaseRT2`进行线性插值
- 对调`_KawaseRT0`和`_KawaseRT2`
- 释放 `_KawaseRT1`

##### 升采样循环

- i = 1
  - source = `_KawaseRT0`，也就是前面插值得到的`_KawaseRT2`
  - destination= `_KawaseRT`
  - 升采样模糊

##### 结束

