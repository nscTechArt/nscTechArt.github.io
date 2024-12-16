---
title: Vulkan Subgroup Tutorial
date: 2024-11-02 22:08 +0800
categories: [Graphics, Every Thing About Vulkan]
media_subpath: /assets/img/Graphics/LearnVulkan/
math: falsejin
---

[Khronos Blog - The Khronos Group Inc](https://www.khronos.org/blog/vulkan-subgroup-tutorial)



还有一些相关的文章

- [Compute shader wave intrinsics tricks | by Angry Tomato! | Medium](https://medium.com/@marehtcone/compute-shader-wave-intrinsics-tricks-e237ffb159ef)
- [Wave Intrinsics · microsoft/DirectXShaderCompiler Wiki](https://github.com/Microsoft/DirectXShaderCompiler/wiki/Wave-Intrinsics)

**借助Subgroup，我们能够在 GPU 上并行运行的多个任务之间实现高效的数据共享和操作。**

Vulkan在1.1版本中引入了一个新的机制，能够让单个运算单元中的并行运行的线程共享数据。我们将这些并行运行的线程称为subgroup。

### How Subgroups are Formed on Hardware

subgroup中的线程，或者说invocation调用，可以有激活与非激活两种状态。激活的线程意味着它在执行计算或正在访问内存。而非激活状态的线程则处于doing noting useful的状态。

所以，什么情况会导致线程处于不激活的状态呢？

#### Small ThreadGroup Size

我们讨论的前提是我们的vulkan程序运行在一个支持的subgroup数量大于1的设备上。我们来看下面这段compute shader：

```glsl
#version 450

layout (local_size_x = 1, local_size_y = 1, local_size_z = 1) in;

void main()
{
	// do work
}
```

运行这个shader，由于设备所支持的subgroup的数量大于1，那么就必定存在非活跃的线程。我们对于subgroup定义是同时运行的线程的集合，那么在这种情况下，我们就没有充分利用到设备。如果subgroup的支持数量为2，则我们的利用率为50%，如果支持数量为4，那么利用率就为25%。

所以，在绝大多数情况下，我们应该尽可能让分发的线程组等于subgroup的数量。

#### Dynamic Branching

我们看下面这段代码：

```glsl
float x = ...; // Some previously set variable
if (x < 0.0f) {
    x = x * -1.0f + 42.0f;
} else {
    x = x - 13.0f;
}
```

在这个例子中，一个subgroup中的线程可能拥有不同的x值，那么在两个分支中，都会有线程因为不满足分支的条件而处于非活跃的状态

#### Avtice Invocations are Happy Invocations

所以，我们应该尽可能使得线程保持活跃的状态

---

### GL_KHR_shader_subgroup

使用subgroup，我们需要启用GLSL扩展：`GL_KHR_shader_subgroup` 。该扩展为我们提供了相关的内置变量，以及相应的内置函数。需要注意的是，这些内置函数以及Vulkan 1.1中`supportedOperations`枚举值而划分为了不同的类别，每个类别的内置函数需要启用特定的扩展。

#### GL_KHR_shader_subgroup_basic

第一个类别是`GL_KHR_shader_subgroup_basic`，这个基础类别引入了subgroup相关的内置变量，以及一些内置函数。

仅限于compute shader阶段：

- `gl_NumbSubgroups`：一个local线程组中的subgroup数量
- `gl_SubgroupID`：在local线程组中的subgroup的索引。索引值的范围为`[0, gl_NumbSubgroups]`

支持所有阶段：

- `gl_SubgroupSize`：与`VkPhysicalDeviceSubgroupProperties`中的`subgroupSize`字段匹配
- `gl_SubgroupInvocationID`：subgroup内某个线程的ID值，值的范围为`[0, gl_SubgroupSize]`
- 
