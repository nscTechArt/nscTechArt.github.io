---
title: Vulkan Tutorial 01 Overview
date: 2024-05-01 22:40 +0800
categories: [Graphics, Vulkan Collections]
media_subpath: /assets/img/Graphics/vulkan collections/
math: false
---

### 1 Origin of Vulkan

与早期图形API类似，**Vulkan旨在为GPU提供跨平台抽象**。但传统API设计时受限于当时以固定功能管线为主的图形硬件环境，开发者只能以标准格式提供顶点数据，在光照与着色功能上受制于GPU厂商。

随着显卡架构发展，可编程功能逐渐增强。这些新特性只能通过补丁式整合到现有API中，导致驱动层抽象不理想，需要大量猜测性代码将开发者意图映射到现代架构。这正是游戏驱动更新常能大幅提升性能的原因。复杂的驱动也带来厂商间兼容性问题，如着色器语法差异。此外，移动设备的爆发式增长引入了新型GPU架构（如基于能耗优化的分块渲染架构），传统API无法有效适配。多线程支持的缺失更导致CPU端瓶颈。

Vulkan为此进行全新设计：

- 通过更显式的API降低驱动开销
- 支持多线程并行创建/提交指令
- 采用标准化着色器字节码格式（SPIR-V）消除编译差异
- 将图形与计算功能统一，充分发挥现代GPU的通用计算能力

---

### 2 What It Takes to Draw a Triangle

在本章节中，我们将高度概括性地了解一下使用Vulkan绘制一个三角形的流程。在后续的博客中，我们将深入每个步骤。

#### Step 1： Instance and Physical Device Selection

Vulkan应用程序的初始化始于通过`VkInstance`配置API。创建实例时需要声明应用信息及要启用的API扩展。实例创建完成后，可查询系统支持的Vulkan硬件设备，并选择一个或多个`VkPhysicalDevice`（物理设备）进行操作。开发者可通过查询显存容量、设备特性等属性（如优先选择独立显卡）来筛选目标设备。

#### Step 2：Logical Device and Queue Families

选定物理设备后，需创建 **`VkDevice`（逻辑设备）**，需明确声明启用的硬件特性（通过 `VkPhysicalDeviceFeatures`，如多视口渲染、64位浮点支持），并指定所需队列家族（Queue Families）。

Vulkan 中绝大多数操作（如绘制指令、内存操作）均通过提交到 **`VkQueue`（队列）** 异步执行。队列从队列家族中分配，每个家族支持特定类型的操作（如独立的图形、计算、内存传输队列家族）。队列家族的支持情况也可作为物理设备筛选的依据。

#### Step 3：Window Surface and Swap Chain

我们需要创建一个窗口来呈现渲染内容。可以通过原生平台API（如Windows的HWND）或者GLFW这样的第三方库。

将渲染内容呈现到窗口上，具体来说需要两个组件：

- `VkSurfaceKHR`：**跨平台的窗口渲染抽象层**，通过WSI（窗口系统接口）扩展实现。GLFW提供`glfwCreateWindowSurface`函数自动处理平台细节（如Windows的HWND、Linux的X11窗口）
- `VkSwapchainKHR`：管理一组渲染目标（帧缓冲），**核心作用是隔离当前渲染帧与屏幕显示帧**，确保仅完整图像被呈现。

#### Step 4：Image Views and Framebuffers

为了向从交换链获取的图像进行绘制，需将其封装为 **`VkImageView`（图像视图）** 和 **`VkFramebuffer`（帧缓冲）**。

`VkImageView`用于指定图像中可使用的特定子资源区域（如某 Mip 层级或数组层）。

`VkFramebuffer`则关联用于颜色、深度和模板附件的`VkImageView`集合。

由于交换链可能包含多个图像，应预先为每个图像创建对应的图像视图和帧缓冲，在绘制时动态选择匹配的帧缓冲。

#### Step 5：Render Passes

**渲染流程（Render Pass）** 定义了渲染操作涉及的**图像类型**、**使用方式**及**内容处理策略**。在绘制三角形的基础案例中，我们需要声明：

- 使用单个图像作为颜色附件
- 在绘制操作前将该附件清空为纯色

渲染流程仅描述图像抽象类型，而 **`VkFramebuffer`（帧缓冲）** 负责将具体图像（通过 `VkImageView`）绑定到Render Pass定义的附件槽位。

#### Step 6：Graphics Pipeline

Vulkan 的 **图形管线（`VkPipeline`）** 通过预先配置硬件状态实现高性能渲染，其核心组成包括：

1. **固定功能状态**
   - 视口尺寸（Viewport Size）
   - 深度测试规则（Depth Compare Op）
   - 颜色混合模式（Color Blending）
   - 图元拓扑类型（Primitive Topology）
2. **可编程状态**
   - 通过 `VkShaderModule` 加载着色器字节码（如 SPIR-V）
   - 着色器阶段绑定（Vertex/Fragment/Geometry Shader）
3. **环境依赖**
   - 关联的渲染流程（Render Pass）定义附件约束
   - 管线布局（Pipeline Layout）声明着色器资源访问规则

与传统 API 的关键差异：**几乎所有管线状态必须预先固化**。若需切换着色器或修改顶点格式，必须**重建整个管线对象**。仅视口尺寸、清屏颜色等极少数参数支持动态调整。开发者需预先创建所有可能的管线组合。

**优势**：

- **驱动优化窗口**：管线状态预先固化，驱动可进行 AOT（Ahead-of-Time）编译优化
- **性能可预测性**：显式的管线切换避免了隐式状态变更的运行时开销
- **无隐式默认值**：强制显式声明所有状态（如颜色混合无默认值），消除行为歧义

#### Step 7：Command Pools and Command Buffers

正如我们前面提到的，在Vulkan中，很多我们想要执行的操作（例如绘制），需要提交到一个队列中。而在提交之前，这些操作则需要被记录到`VkCommandBuffer`中。

`VkCommandBuffer`从`VkCommandPool`中分配而来，每个`VkCommandPool`又与特定的队列族相关联。

在绘制三角形这个简单案例中，我们需要将下列操作记录到command buffer中：

- 开始render pass
- 绑定图形管线
- 绘制三个顶点
- 结束render pass

因为framebuffer中的图像取决于swapchain具体给到我们哪个，所以我们需要为每个可能使用到的图像都记录一个对应的command buffer，并在绘制时选择恰当的图像。当然，我们也可以在每帧中反复地记录command buffer，只是这样效率堪忧。

#### Step 8 Main Loop

现在绘制命令已被封装到命令缓冲中，主循环的逻辑就相对清晰了。我们首先通过`vkAcquireNextImageKHR`从交换链获取一个图像，然后为该图像选择合适的命令缓冲，并通过`vkQueueSubmit`提交执行。最后，通过`vkQueuePresentKHR`将图像交还给交换链以进行屏幕呈现。"

提交到队列的操作是异步执行的，因此必须使用**信号量**等同步对象来保证执行顺序。绘制命令缓冲的执行必须设置为等待图像获取完成，否则可能会开始渲染一个仍在被交换链读取用于屏幕呈现的图像。同理，`vkQueuePresentKHR`的调用需要等待渲染完成，为此我们会使用第二个信号量，该信号量在渲染完成后触发。