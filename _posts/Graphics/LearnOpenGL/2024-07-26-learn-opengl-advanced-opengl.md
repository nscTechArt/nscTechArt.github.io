---
title: Advanced OpenGL
date: 2024-07-17 05:46 +0800
categories: [Graphics, Learn OpenGL]
media_subpath: /assets/img/Graphics/LearnOpenGL/
math: true
---

### Depth tesing

#### Depth value precision

depth buffer中存储了范围在0.0到1.0之间表示深度的值，在深度测试中，我们获取当前观察视角下场景中的物体的Z值，然后与depth buffer中存储的值进行比较。但是在View space中，物体的z值在投影视锥体的`near`和`far`平面的范围中取值，并非[0.0, 1.0]。所以在深度测试之前，我们还需要对Z值要进行重映射。

一种重映射的方法是线性变换：


$$
F_{depth}=\frac{z-near}{far-near}
$$


在这个变换的公式下，Z值与对应深度值的关系为：

![](depth_linear_graph.png)

但在实践中，我们并不会使用这样的线性映射，这是透视投影的性质决定的：深度值实际上与Z值的倒数成正比。这样的性质会带来的影响是，当Z值较小时，depth buffer的精度较高，而Z值较大时，depth buffer的精度较低。OpenGL所使用的重映射公式是：


$$
F_{depth}=\frac{1/z-1/near}{1/far-1/near}
$$


对应的，我们可以从下图中看到Z值与深度值之间的非线性关系。

![](depth_non_linear_graph.png)

#### Visualizing the depth buffer

我们可以在fragment shader中输出片段的深度值来可视化depth buffer。

```glsl
void main()
{             
    FragColor = vec4(vec3(gl_FragCoord.z), 1.0);
}  
```

只是，从fragment shader中输出的深度值是非线性且在[0.0，1.0]的范围内，所以只有当相机距离场景中物体较近时，才能看到深色的像素，为了更好地可视化depth buffer，我们可以将深度值重映射到线性的[0, 1]上：

```glsl
#version 330 core
out vec4 FragColor;

float near = 0.1;
float far = 100.0;

float LinearizeDepth(float depth)
{
    // first back to NDC
    float z = depth * 2.0 - 1.0; // [-1, 1]
    return (2.0 * near * far) / (far + near - z * (far -near));
}

void main()
{
    float depth = LinearizeDepth(gl_FragCoord.z) / far;
    FragColor = vec4(vec3(depth), 1.0);
}
```

#### Z-fighting

当两个或多个几何体在depth buffer中具有非常接近的深度值时，会在渲染过程中相互交替地彼此遮挡，呈现出类似闪烁的视觉效果。

出现z-fighting的主要原因是depth buffer的精度有效，以至于无法区分出相近几何体的深度值。同时，在计算深度值时，浮点数的舍入误差也会导致深度值的微小差异，从而导致z-fighting。

为了减少或避免z-fighting，常用的方法有：

1. **增加深度缓冲区精度**：使用更高精度的深度缓冲区，比如从16位提升到24位或32位。这可以提供更精确的深度比较。
2. **偏移几何体**：通过将其中一个几何体稍微移动来增加它们之间的深度差异。例如，可以使用`glPolygonOffset`函数在OpenGL中对多边形应用深度偏移。
3. **调整投影矩阵**：通过调整投影矩阵的近平面和远平面，优化深度缓冲区的使用范围。
4. **使用不同的渲染顺序**：在某些情况下，可以通过调整渲染顺序来避免Z-fighting。例如，先渲染较远的物体，再渲染较近的物体。
5. **合并几何体**：在可能的情况下，将两个重叠的几何体合并为一个几何体，这样可以避免Z-fighting。

---

### Framebuffers

frame buffer是OpenGL中用来存储渲染图像的内存区域，它包含了多种类型的buffer，每种类型的buffer负责渲染图像中的不同部分或属性。主要的buffer包括color、depth、stencil。

当我们在OpenGL中创建一个上下文时，系统会自动创建一个默认的帧缓冲。默认帧缓冲用于在屏幕上显示最终的渲染结果。

除了默认帧缓冲，OpenGL 允许你创建自定义帧缓冲对象（FBO, Framebuffer Object）。自定义帧缓冲允许你将渲染结果存储到纹理或渲染缓冲对象中，而不是直接显示在屏幕上。这样可以实现离屏渲染（off-screen rendering），用于后处理效果、阴影贴图、反射等。

#### Creating a framebuffer

创建framebuffer的方法如下：

```c++
unsigned int fbo;
glGenFramebuffers(1, &fbo);
```

当完成创建后，我们还需要将它绑定为当前启用的frame buffer

```c++
glBindFrameBuffer(GL_FRAMEBUFFER, fbo);
```

这里可能有些疑惑，类似`glBindVertexArray()`，既然已经函数命名已经明确了绑定的对象是frame buffer，为什么还需要传递一个`GL_FRAMEBUFFER`参数呢？这是因为OpenGL同样提供了专门用于读取或写入的frame buffer，分别需要绑定到`GL_READ_FRAMEBUFFER`和`GL_DRAW_FRAMEBUFFER` 上。

完成创建与绑定后，当前的frame buffer对象还不能使用，因为该frame buffer是不完整的。一个**complete**的frame buffer需要满足以下条件：

- 至少绑定有一个buffer（color，depth，stencil）
- 至少要有一个颜色附件 color attachment
- 所有的附件也需要是完整的
- 每个buffer都相同的采样数量

当我们完成必要的操作，得到了一个完整的frame buffer后，我们可以调用函数glCheckFramebuffersStatus来检查当前绑定的frame buffer是否完整：

```c++
if(glCheckFramebufferStatus(GL_FRAMEBUFFER) == GL_FRAMEBUFFER_COMPLETE) ...
```

此时，后续的所有渲染相关的操作都会渲染到当前绑定的frame buffer中的附件中。但由于我们自定义的frame buffer并非默认的frame buffer，渲染操作的结果并不会呈现到屏幕上。我们可以调用下面的代码让默认framebuffer成为当前绑定的frame buffer

```c++
glBindFramebuffer(GL_FRAMEBUFFER, 0);   
```

当不再需要创建的frame buffer后，我们需要将其删除：

```c++
glDeleteFramebuffers(1, &fbo);  
```

在深入之前，我们首先需要理解frame buffer和附件的关系。**frame buffer是一个容器，用于存储渲染结果，但是它不会直接存储图像数据，而是通过附加各种附件来存储这些数据。换句话说，frame buffer的主要任务就是组织和管理这些附件，而附件是frame buffer中具体的存储单元**。

OpenGL中的附件可有两种形式：纹理texture和render buffer对象。它们在用途、性能、灵活性上有一些重要区别。它们各自的特点是：

- **Texure attachments**
  - 可访问性：纹理附件可以在shader中作为采样器使用
  - 多样性：纹理附件可以有多种格式，如2D纹理、3D纹理、cubemap，可以适应不同需求
- **Renderbuffer Attachment**
  - 高效性：渲染缓冲对象通常比纹理附件在写入速度和内存利用效率方面更高效，特别是在需要频繁更新和重写的场景中。
  - 简易性：renderbuffer不需要像纹理那样配置采样参数（如过滤方式、wrap mode等）
  - 固定用途：renderbuffer对象不适用于需要直接在着色器中访问的附件，如depth buffer、stencil buffer

简而言之，如果不需要从特定缓冲区采样数据，那么明智的做法是为该特定缓冲区使用渲染缓冲区对象。如果您需要从特定缓冲区采样数据（例如颜色或深度值），则应使用纹理附件。

接下来我们分别来看看两种附件类型在代码中如何实现

#### Texture attachments

创建纹理附件的代码如下：

```c++
unsigned int texture;
glGenTexture(1, &texture);
glBindTexture(GL_TEXTURE_2D, texture);

glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, SCREEN_WIDTH, SCREEN_HEIGHT, 0, GL_RGB, GL_UNSIGNED_BYTE, nullptr);

glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);  
```

这里需要注意的是，我们调用`glTexImage2D`为纹理附件分配显存，但仅此而已，我们此时不会为该存储填充数据。当我们完成创建与配置后，我们就可以将其附加到frame buffer中:

```c++
glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, texture, 0);
```

该函数的参数解释如下：

- `target`：我们自定义的framebuffer的类型（draw、read、或着both）
- `attachment`：我们要附加的附件的类型。此时我们想要附加颜色附件，所以该参数为`GL_COLOR_ATTACHMENT0`。之所以是`0`，是因为在延迟渲染中，会使用到多个颜色附件。
- `textarget`：作为附件的纹理的纹理类型，在这里是`GL_TEXTURE_2D`
- `texture`：实际用于附加的纹理
- `level`：mipmap的层级，默认为`0`

除了颜色附件，我们还可以附加深度纹理或模板纹理。对于深度纹理来说，参数`attachment`为`GL_DEPTH_ATTACHMENT`，同时该纹理的格式为`GL_DEPTH_COMPONENT`。对于模版纹理来说，参数`attachment`为`GL_STENCIL_ATTACHMENT` ，而纹理格式为`GL_STENCIL_INDEX`

实际上，我们可以将depth buffer和stencil buffer存放在一个纹理附件中，这样的纹理附件精度为32位，其中24位用于存储depth，而8位用于存储stencil。此时，附件的类型需要声明为`GL_DEPTH_STENCIL_ATTACHMENT` ，如下所示：

```c++
glTexImage2D(
  GL_TEXTURE_2D, 0, GL_DEPTH24_STENCIL8, SCREEN_WIDTH, SCREEN_HEIGHT, 0, 
  GL_DEPTH_STENCIL, GL_UNSIGNED_INT_24_8, NULL
);

glFramebufferTexture2D(GL_FRAMEBUFFER, GL_DEPTH_STENCIL_ATTACHMENT, GL_TEXTURE_2D, texture, 0);
```

这里我们可以注意到，函数`glTexImage2D()`的`internalformat`为`GL_DEPTH24_STENCIL8`，而`format`参数为`GL_DEPTH_STENCIL`。我们再次回顾一下，`internalformat` 指定 OpenGL 如何存储纹理，即纹理载入到GPU中所使用的格式，而 `format` 是图片本身的格式。

#### Renderbuffer object attachments

renderbuffer object的主要特定是，不能直接从中读取数据。该特点使得OpenGL可以进行一些内存优化，所以离屏渲染到framebuffer中时，render buffer object的性能比纹理附件更高。

渲染缓冲区对象将所有渲染数据直接存储到其缓冲区中，无需转换为特定于纹理的格式，这使得它们作为可写存储介质更快。虽然无法直接读取它们，但仍可以通过缓慢的 `glReadPixels` 读取它们。这会从当前绑定的frame buffer区返回指定的像素区域，而并非直接从附件本身返回。

由于renderbuffer object中的数据具有原生的格式，所以写入数据和拷贝数据到其他buffer的速度相比与纹理更快。

这些性质使得render buffer对象通常用作深度与模板的附件，因为大多数情况下，我们需要深度信息与模板信息来完成对应的测试，但是并不需要从中采样。

创建renderbuffer对象的代码如下：

```c++
unsigned int rbo;
glGenRenderbuffers(1, &rbo);
```

同样的，我们需要将其绑定到当前启用的render buffer对象上：

```c++
glBindRenderBuffer(GL_RENDERBUFFER, rbo);
```

然后，我们将当前的render buffer声明为用作深度和模板附件：

```c++
glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH24_STENCIL8, 800, 600);
```

最后，我们就可以将其绑定到当前的frame buffer上：

```c++
glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_STENCIL_ATTACHMENT, GL_RENDERBUFFER, rbo);  
```

#### Rendering to a texture

接下来，我们来结合具体的案例来强化一下对于frame buffer的理解。我们将把场景绘制到一个颜色纹理上，然后将该纹理作为一个与屏幕等宽高的quad的纹理。最终的效果与正常渲染场景的效果没有任何区别。下面是具体的步骤。

首先，我们创建并绑定一个framebuffer对象：

```c++
unsigned int framebuffer;
glGenFramebuffers(1, &frambuffer);
glBindFramebuffer(GL_FRAMEBUFFER, framebuffer);
```

然后我们创建一个2D纹理，作为该frame buffer的颜色附件：

```c++
// generate texture
unsigned int textureColorbuffer;
glGenTextures(1, &textureColorbuffer);
glBindTexture(GL_TEXTURE_2D, textureColorbuffer);
glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, 800, 600, 0, GL_RGB, GL_UNSIGNED_BYTE, NULL);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR );
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
glBindTexture(GL_TEXTURE_2D, 0);

// attach it to currently bound framebuffer object
glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, textureColorbuffer, 0); 
```

此外，我们还需要确保OpenGL能够正常执行深度测试，所以除了颜色附件，我们还需要提供深度附件。由于我们只需要在颜色附件中采样颜色信息，所以我们可以使用renderbuffer对象作为深度附件：

```c++
unsigned int rbo;
glGenRenderbuffers(1, &rbo);
glBindRenderbuffer(GL_RENDERBUFFER, rbo); 
glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH24_STENCIL8, 800, 600);  
glBindRenderbuffer(GL_RENDERBUFFER, 0);
glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_STENCIL_ATTACHMENT, GL_RENDERBUFFER, rbo);
```

然后，我们检查framebuffer对象是否完整：

```c++
if(glCheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE)
	std::cout << "ERROR::FRAMEBUFFER:: Framebuffer is not complete!" << std::endl;
glBindFramebuffer(GL_FRAMEBUFFER, 0);  
```

现在，我们已经配置好了framebuffer，接下来我们需要以该frame buffer作为render target。当我们切换了当前启用的frame buffer后，所有的渲染指令都会影响当前的frame buffer，此外相关的深度与模板测试也会自动从当前绑定的frame buffer中的深度与模板附件中读取信息。

所以，想要实现我们的示例场景，我们需要按照以下步骤：

- 将场景正常绘制到我们自定义的frame buffer中
- 绑定会默认的frame buffer
- 使用自定义的frame buffer中的颜色附件作为纹理，绘制一个与屏幕等宽高的四边形。

#### Post-processing

我们可以通过修改SceneColor来实现各种各样的后处理，如去色、边缘检测、模糊等。这里就不展开讨论了

---

### Cubemaps

cubemap有一个重要的特点，那就是我们可以使用方向向量进行采样。如下图所示：

![](cubemaps_sampling.png)

在这里，方向向量的长度无关紧要，因为OpenGL会为我们计算该向量与cubemap的相交点，并返回对应的纹理值。

#### Creating a cubemap

cubemap的创建与绑定过程如下:

```c++
unsignd int textureID;
glGenTextures(1, &textureID);
glBindTexture(GL_TEXTURE_CUBE_MAP, textureID);
```

cubemap中包含有六个纹理，所以我们需要把所有纹理依次传递到GPU中，只是对于cubemap来说，由于每个纹理对应了特定的面，所以我们不能使用`GL_TEXTURE_2D`，而是应该使用`GL_TEXTURE_CUBE_MAP_POSITIVE_X`等，这些枚举数同样遵循递增，所以我们可以在一个循环中完成配置，即：

```c++
int width, height, channels;
unsigned char *data;
for (unsigned int i = 0; i < texture_faces.size(); i++)
{
    data = stbi_load(textures_faces[i].c_str(), &width, &height, &channels, 0);
    glTexImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, GL_RGB, width, height, 0, GL_RGB, GL_UNSIGNED_BYTE, data);
}
```

其中，`textures_faces`是包含了所有纹理的文件路径的`vector`。

此外，cubemap本质上仍然是纹理，但是通常情况下六个纹理共享相同的纹理设置：

```c++
glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_WRAP_R, GL_CLAMP_TO_EDGE);  
```

可以注意到，cubemap在所有轴向上的wrap mode都设置为了`GL_CLAMP_TO_EDGE`，这是为了避免在采样时出现接缝。同时，cubemap还需要额外在R轴上进行设置，S轴和T轴用于确定cubemap在某个特定面上的位置，而R轴用于选择在cubemap的哪个面上采样。

在fragment shader中，我们需要使用一个新的采样器samplerCube，同时纹理坐标需要是一个三维向量：

```glsl
in vec3 textureDir; // direction vector representing a 3D texture coordinate
uniform samplerCube cubemap; // cubemap texture sampler

void main()
{             
    FragColor = texture(cubemap, textureDir);
}  
```

#### Skybox

cubemap的一个重要作用是作为天空盒使用。在实现天空盒时，有一个简单的优化手段，就是将天空盒在不透明物体完成绘制后再进行绘制。当先渲染不透明物体时，depth buffer会记录这些物体的深度值。在渲染天空盒时，深度测试会根据这些深度值剔除被不透明物体遮挡的部分，这样可以减少不必要的片段着色运算，提高渲染效率。

但问题在于，我们为绘制天空盒所提供的是一个单位立方体，这样小的立方体能够通过大部分深度测试。那要怎么做呢？我们优化的手段是，在渲染天空盒时，通过设置glDepthMask(GL_FALSE)关闭深度写入，以确保天空盒的深度值不会覆盖其他物体的深度值，然后在天空盒的vertex shader中，手动设置深度值为1。从而确保天空盒总是在最远处绘制，而不会覆盖其他已经渲染的不透明物体。除了在vertex shader中设置深度值，我们也可以直接在fragment shader中通过内置变量`gl_FragDepth = 1.0`来设置。

还有一点非常重要，因为天空盒的目的就是为我们呈现一个背景，无论相机在场景中处于什么物质，天空盒都是恒定的。要实现这样效果，需要移除掉天空盒的View矩阵中的平移部分：

```c++
glm::mat4 view = glm::mat4(glm::mat3(camera.GetViewMatrix()));  
```

最后，在绘制天空盒时，我们需要将深度测试函数设置为`glDepthFunc(GL_LEQUAL)`，因为天空盒会将depth buffer的值刷新为1，如果使用OpenGL默认的`glDepthFunc(GL_LESS)`，则天空盒就无法通过深度测试了。

#### Environment mapping

##### Reflection

