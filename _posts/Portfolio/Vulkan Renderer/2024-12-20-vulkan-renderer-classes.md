---
title: Vulkan Renderer Introduction
date: 2024-12-16 14:06 +0800
categories: [Portfolio, Vulkan Renderer]
media_subpath: /assets/img/Portfolio/SimpleVulkanRenderer/
math: false
---

本系列博客将会尽可能细致地拆解我实现的简单Vulkan渲染器。本篇作为系列的第一篇，主要是看看程序的入口——*main.cpp*文件所包含的内容，以快速地介绍程序的简单结构以及运行逻辑。

> 我目前仍是C++、Vulkan以及图形学的初学者，诚恳地希望能够得到大家的指导与帮助。

---

因为对Vulkan中的绝大多数功能进行了封装，所以*main.cpp*文件函数相对较短。从注释以及函数调用中就可以了解到程序的运行逻辑是怎样的。main.cpp文件可以分为四个部分：

### Camera/Scene Data

*main.cpp*中声明了记录相机与场景数据的结构体：

```c++
struct CameraData
{
    mat4 proj;
    mat4 view;
    EngineCore::Camera::FrustumCone frustumCone;
    vec3 cameraPos;
    float nearClipping;
};

struct SceneData
{
    vec3 lightPosition;
    float lightIntensity;
};
```
{: file="main.cpp"}

---

### Initialization

渲染器的初始化可以分为两类：

- 引擎相关
- Vulkan相关

#### 引擎相关

初始化渲染器的`Window`类与`Camera`类。在初始化相机时可以自行定义相机的初始位置与目标位置。

```c++
// initialize GLFW window and camera
// ---------------------------------
EngineCore::Window window;
EngineCore::TrackBallCamera camera(cameraPos, targetPos, window.getAspectRatio());
window.initialize(&camera);
```
{: file="main.cpp"}

#### Vulkan相关

首先我们需要创建一个`VulkanCore::Context`对象。这个类封装了很多Vulkan对象，包括`VkIntance`, `VkPhysicalDevice`, `VkDevice`, `VkSurfaceKHR`，还包含了一些其他的类的引用，如`VulkanCore::Swapchain`，此外还有一些其他对象，例如逻辑设备所使用队列。我把Vulkan中的一些拓展、特性以及队列属性封装到了`enableXXX()`等函数中，可以根据渲染器的需求灵活配置。

```c++
// create a Vulkan context
// -----------------------
VulkanCore::Context::enableDefaultFeatures();
VulkanCore::Context::enableBindlessRenderingFeatures();
VulkanCore::Context::enableGPUDrivenRenderingFeatures();
VulkanCore::Context::enableFragmentShaderBarycentricFeatures();
VulkanCore::Context::enableRequestedQueueFamilies(VK_QUEUE_COMPUTE_BIT);
VulkanCore::Context context(window.getWindow());
```
{: file="main.cpp"}

当context初始化完成后，还需要通过context创建交换链以及`VulkanCore::CommandQueueManager`对象

```c++
// create swap chain
// -----------------
context.createSwapchain();
auto inflightFrameCount = context.getInFlightFrameCount();

// create a graphics command queue manager
// ---------------------------------------
auto commandManager = context.createGraphicsCommandQueue(inflightFrameCount, inflightFrameCount);
```
{: file="main.cpp"}

此外，还需要创建出一个全局相关的渲染资源：

```c++
// create shared color/depth attachments
// -------------------------------------
context.createColorTexture(false);
context.createDepthTexture(false);

// create shared render pass and framebuffers
// ------------------------------------------
context.createRenderPassAndFramebuffers();
```
{: file="main.cpp"}

在渲染器中，执行实际的渲染逻辑的是`EngineCore::xxxRenderer`对象。`EngineCore::BistroRenderer`则是一个完整的Renderer对象的封装，包含了rendering、shadow、ambient occlusion等渲染流程。此外，`EngineCore::ImGuiManage`r本质上也是一个`Renderer`对象，包含了对于ImGui的二次封装。

```c++
// initialize renderers
// --------------------
auto bistroRenderer = std::make_unique<EngineCore::BistroRenderer>(context, commandManager);
auto imguiManager = std::make_unique<EngineCore::ImGuiManager>(window.getWindow(), context);
```
{: file="main.cpp"}

至此，所有的初始化都完成了，接下来就可以进入渲染循环了。

---

### Render Loop

渲染循环的结构总体来说比较清晰，包括：

- 获取当前帧的交换链图像
- 更新Uniform Buffer
- 开始记录Command Buffer
- 遍历所有`Renderer`对象，目前只有`EngineCore::BistroRenderer`一个对象，它包含了渲染Bistro场景的所有必要流程
- 渲染ImGui
- 结束记录Command Buffer并提交
- 呈现图像
- 为下一帧渲染做准备

```c++
// main loop
// ---------
while (!glfwWindowShouldClose(window.getWindow())) 
{   
    // glfw updates
    // ------------
    glfwPollEvents();
    Utils::showFPSOnTerminal();

    // acquire a swapchain image to render with
    // ----------------------------------------
    const auto currentImage = context.getSwapchain()->acquireImage();
    const auto currentImageIndex = context.getSwapchain()->getCurrentImageIndex();

    // update uniform buffer
    // ---------------------
    bistroRenderer->updateRingBuffers(camera);

    // now we can start recording commands
    // -----------------------------------
    const auto commandBuffer = commandManager.beginCommandBuffer();

    // iterate through all renderers
    // -----------------------------
    bistroRenderer->render(commandBuffer, currentImageIndex);

    // render imgui
    // ------------
    imguiManager->begin();
    bistroRenderer->onImGuiUpdate(imguiManager);
    imguiManager->end(commandBuffer, currentImageIndex);

    // end recording commands
    // ----------------------
    commandManager.endCmdBuffer(commandBuffer);

    // submit the recorded commands
    // ----------------------------
    constexpr VkPipelineStageFlags submitStageFlags = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
    const auto submitInfo = context.getSwapchain()->createSubmitInfo(&commandBuffer, &submitStageFlags);
    commandManager.submitCmdBuffers(&submitInfo);

    // present the image
    // -----------------
    context.getSwapchain()->present();

    // prepare for the next frame
    // --------------------------
    commandManager.prepareForNextFrame();
}
```
{: file="main.cpp"}

---

### Shut Down

封装的类会确保所有的资源都能够正确且安全地释放。此外，在程序结束前，还需要确保所有指令已完成执行：

```c++
// wait for the device to finish before cleaning up
// ------------------------------------------------
commandManager.waitUtilAllSubmitsAreFinished();
```
{: file="main.cpp"}

