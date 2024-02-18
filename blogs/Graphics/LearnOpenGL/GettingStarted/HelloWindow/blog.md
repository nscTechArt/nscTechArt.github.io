---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/GettingStarted/HelloWindow/index.html
title: Hello Window
---

### Hello Window

---

本篇博客，我们来创建OpenGL中的第一个窗口。

首先，我们引入OpenGL所需要的头文件，注意，需要在引用GLFW之前引用GLAD。

```c++
#include <glad/glad.h>
#include <GLFW/glfw3.h>
```

在`main`函数中完成对GLFW窗口的初始化。首先调用`glfwInit`，接下来用`glfwWindowHint`来配置GLFW的版本为3.3，再次调用`glfwWindowHint`，来告诉GLFW我们想要使用core-profile，从而获取更少的OpenGL功能子集，而不再需要向后兼容的功能。

```c++
int main()
{
    glfwInit();
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    return 0;
}
```

现在我们需要创建一个窗口对象(window object)，该窗口对象保存了所有窗口数据，几乎所有的GLFW函数都需要这个对象。

```c++
GLFWwindow* window = glfwCreateWindow(800, 600, "Getting Started", nullptr, nullptr);
if (window == nullptr)
{
    std::cout << "Failed to create GLFW window\n";
    glfwTerminate();
    return -1;
}
glfwMakeContextCurrent(window);
```

`glfwCreateWindow`的前两个参数是窗口的宽高，第三个参数是窗口的名字，后两个参数我们暂时忽略。这个方法会返回一个`GLFWWindow`对象，创建结束后，我们用`glfwMakeContextCurrent()`来告诉GLFW把创建好的窗口的context作为当前主线程的context。

---

之前我们提到过，我们使用GLAD来管理OpenGL的函数指针，所以让我们首先完成GLAD的初始化。

```c++
if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress))
{
    std::cout << "Failed to initialize GLAD" << '\n';
    return -1;
}  
```

---

在开始渲染之前，我们还需要处理一件事：通过`glViewport`告诉OpenGL渲染窗口的尺寸。只有这样，OpenGL才能知道我们希望如何显示数据和窗口坐标。`glViewport`的前两个参数定义了窗口左下角的位置，后两个参数规定渲染窗口的宽高，我们将其与GLFW窗口宽高保持一致。

```c++
glViewport(0, 0, 800, 600);
```

不过，视口尺寸其实也可以小于GLFW窗口尺寸，这样我们就可以在OpenGl的视口范围以外显示其他元素。

我们还需要考虑到，用户每次调整GLFW窗口大小时，视口尺寸也需要调整。我们可以注册一个回调函数，每次调整窗口大小时都会触发调用。回调函数的原型和定义分别如下：

```c++
void framebuffer_size_callback(GLFWwindow* window, int width, int height);

void framebuffer_size_callback(GLFWwindow* window, int width, int height)
{
    glViewport(0, 0, width, height);
}
```

我们需要告诉GLFW在窗口大小调整时调用这个函数。

```c++
glfwSetFramebufferSizeCallback(window, framebuffer_size_callback);
```

---

我们希望程序可以持续绘制图形并处理用户输入，知道我们明确要关闭程序。因为，我们需要一个while循环来实现这个需求。

```c++
while (!glfwWindowShouldClose(window))
{
    glfwSwapBuffers(window);
    glfwPollEvents();
}
```

每次循环的开始，`glfwWindowShouldClose`都会检测GLFW是否收到了关闭窗口的指令，如果是，循环终止，程序也会随之结束。

`glfwPollEvents`会检测事件的触发(比如键盘的输入或鼠标的移动)、窗口状态的更新、调用对应的函数(比如回调函数)。`glfwSwapBuffers`会交换颜色缓冲，并将其作为输出显示到屏幕上。

---

当循环结束时，我们需要清理、删除所有已分配的GLFW资源，可以通过调用`glfwTerminate`实现。

```c++
glfwTerminate();
return 0;
```

如果此时运行程序的话，我们将会得到纯黑的窗口。

---

我们希望能在GLFW中实现输入控制。将相关代码封装在`processInput`函数中，并在循环中调用。目前来看，我们可以在processInput中实现GLFW窗口的关闭。

```c++
void processInput(GLFWwindow* window)
{
    if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_TRUE)
        glfwSetWindowShouldClose(window, true);
}
```

---

所有渲染相关的指令也会放进循环中，为了测试效果，我们在循环中使用指定颜色清除颜色缓冲区。

```c++
while (!glfwWindowShouldClose(window))
{
    processInput(window);

    glClearColor(0.2f, 0.3f, 0.3f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);
    
    glfwSwapBuffers(window);
    glfwPollEvents();
}
```

