---
title: Advanced OpenGL
date: 2024-07-26 05:46 +0800
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

---

### Advanced Data

#### glBufferSubData

`glBufferSubData` 是 OpenGL 中的一个函数，用于更新已经存在的缓冲区对象的一部分数据。它的主要作用是在不重新分配整个缓冲区的情况下更新缓冲区的一部分数据，这对于性能优化非常重要。函数原型为：

```c++
void glBufferSubData(GLenum target, GLintptr offset, GLsizeiptr size, const void *data);
```

其中：

- `target`: 指定要更新的缓冲区对象的目标。常见的值包括 `GL_ARRAY_BUFFER`、`GL_ELEMENT_ARRAY_BUFFER` 等。
- `offset`: 指定要更新的数据在缓冲区中的起始位置，以字节为单位。
- `size`: 指定要更新的数据的大小，以字节为单位。
- `data`: 指向包含新数据的内存指针。

使用`glBufferSubData`有额外几点需要我们注意：

- `glBufferSubData`无法改变buffer的大小，只能更新已有的内容。
- 更新的范围不能超出buffer的边界，否则会导致未定义的行为

#### glMapBuffer

`glMapBuffer` 是 OpenGL 中用于将缓冲区对象的内容映射到客户端地址空间的函数。这允许直接访问缓冲区对象的内存，从而进行读写操作。使用 `glMapBuffer` 可以更高效地更新缓冲区数据，尤其是当需要频繁更新或读取数据时函数原型为：

```c++
void* glMapBuffer(GLenum target, GLenum access);
```

其中：

- `target`: 指定要映射的缓冲区对象的目标。常见的值包括 `GL_ARRAY_BUFFER`、`GL_ELEMENT_ARRAY_BUFFER` 等。

- `access`: 指定访问权限。可以是以下值之一：

  - `GL_READ_ONLY`: 只读访问。

  - `GL_WRITE_ONLY`: 只写访问。

  - `GL_READ_WRITE`: 读写访问。

同时，调用 `glUnmapBuffer` 是必要的，如果在未解除映射的情况下再次映射缓冲区，可能会导致错误。

#### Batching vertex attributes

目前为止，我们所使用的vertex data一直采用了interleaved的方式，即把每个顶点的位置、法线、纹理坐标等顶点属性并排放在内存中。现在我们对于OpenGL中的buffer有了更深入的了解，所以我们可以使用其他组织形式的vertex data了。

我们可以根据不同类型的顶点属性，将vertex data打包起来。换句话说，interleaved的模式中，vertex data是123123123的形式，而batched模型中，则采用了111222332的形式。

在OpenGL程序中，我们分别提供顶点的位置数组，法线数组、纹理数组等，然后通过函数`glBufferSubData`向GPU传递vertex data。如下所示：

```c++
float positions[] = {...};
float normals[] = {...};
float tex[] = {...};
// fill buffer
glBufferSubData(GL_ARRAY_BUFFER, 0, sizeof(positions), &positions);
glBufferSubData(GL_ARRAY_BUFFER, sizeof(positions), sizeof(normals), &normals);
glBufferSubData(GL_ARRAY_BUFFER, sizeof(positions) + sizeof(normals), sizeof(tex), &tex);
```

在batched形式下，我们还需要调整配置顶点属性的方法：

```c++
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), 0);  
glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)(sizeof(positions)));  
glVertexAttribPointer(
  2, 2, GL_FLOAT, GL_FALSE, 2 * sizeof(float), (void*)(sizeof(positions) + sizeof(normals)));  
```

我们可以注意到，此时步长的大小为当前一个顶点属性的长度

#### Copying buffers

某些情况下，当我们填充完一个buffer后，还需要将该buffer中的数据拷贝到其他buffer中使用，这种情况下，我们可以使用函数`glCopyBufferSubData`，该函数用于在两个buffer对象之间拷贝数据，从而避免我们将数据传递到CPU内存中再回传到GPU中。函数原型为：

```c++
void glCopyBufferSubData(GLenum readTarget, GLenum writeTarget, GLintptr readOffset, GLintptr writeOffset, GLsizeiptr size);
```

其中：

- `readTarget`：源缓冲区的目标类型。常见的值包括 `GL_ARRAY_BUFFER`、`GL_ELEMENT_ARRAY_BUFFER` 等。
- `writeTarget`：目标缓冲区的目标类型。值类似于 `readTarget`。
- `readOffset`：源缓冲区的偏移量，以字节为单位，从这个位置开始复制数据。
- `writeOffset`：目标缓冲区的偏移量，以字节为单位，从这个位置开始写入数据。
- `size`：要复制的数据大小，以字节为单位。

在调用该函数之前，`readTarget`和`writeTarget`必须分别绑定到 `GL_COPY_READ_BUFFER` 和 `GL_COPY_WRITE_BUFFER`。

---

### Advanced GLSL

#### Interface Blocks

目前为止，当我们从vertex shader中向fragment shader中传递数据时，我们都需要分别在vertex shader和fragment shader中声明若干个命名匹配的变量。如果数据过多，则维护起来会很麻烦。

GLSL为我们提供了名为interface blocks的结构，可以帮助我们更好地组织变量。它的声明与结构体类似，只是额外需要`in`和`out`关键字，用于表明该block用于输入还是输出。

#### Uniform Buffer Objects

shader中除了普通变量，还可能使用了大量的uniform变量。如果我们的OpenGL程序中使用了多个shader，则我们需要为每个shader分别传递uniform变量的值，尽管它们对于很多shader都是一样的，比如投影和观察矩阵，或者场景中的光源信息等。

为此，OpenGL提供了uniform buffer对象，它用于存储和管理统一变量，提供了一种高效的方式来在多个着色器程序之间共享统一变量数据，避免为每个shader程序单独设置uniform变量。

绝大多数情况下，场景中所有的shader程序所使用的`project`和`view`矩阵都是一样的，所以是使用uniform buffer对象的绝佳例子。我们在vertex shader中创建一个uniform block，用于存储`projection`和`view`矩阵：

```glsl
#version 330 core
layout (location = 0) in vec3 aPos;

layout (std140) uniform Matrices
{
    mat4 projection;
    mat4 view;
};

uniform mat4 model;

void main()
{
    gl_Position = projection * view * model * vec4(aPos, 1.0);
}  
```

我们将这两个矩阵的值存储在OpenGL代码中的某个buffer上，所有声明了这个uniform block的shader都可以直接使用这两个矩阵。

#### Uniform buffer layout

**由于 UBO 是一块保留的全局 GPU 内存，而这块内存本身只是原始的内存块，并不包含有关数据类型的信息。也就是说，当我们创建和填充UBO时，我们只是将原始数据放入了这块内存中。为了让 OpenGL 正确地解释和使用这块内存中的数据，我们需要明确指定这块内存的布局方式，即哪些字节对应着哪些统一变量。通过这种方式，OpenGL 能够正确地将 UBO 中的数据映射到着色器中的统一变量。**

我们考虑下面的这个uniform block：

```glsl
layout (std140) uniform ExampleBlock
{
    float value;
    vec3 vector;
    mat4 matrix;
    float values[3];
    bool boolean;
    int integer;
};
```

我们需要了解uniform block中每个变量的大小（以字节为单位）和相对于块起始位置的偏移量，以便在buffer中按顺序正确地放置它们。**尽管 OpenGL 明确规定了每种数据类型的大小，但它并未明确规定变量之间的间距。也就是说，硬件可能会在某些情况下在变量之间添加额外的字节，以满足对齐要求。例如，硬件可能会将 `vec3` 填充为包含 4 个浮点数的数组，然后再追加一个 `float` 变量。**根据需要自行决定变量的位置或填充，这对硬件来说是一个很好的特性，但对开发者而言可能会带来额外的复杂性。

在GLSL中，默认的uniform变量的内存布局是*shared*布局，之所以称为共享布局，是因为一旦硬件定义了uniform变量的偏移量，这些偏移量在多个shader程序之间是一直的。在共享布局中，只要uniform变量的顺序保持不变，GLSL就可以出于优化的目的而重新定位uniform变量，也就是说，硬件可以根据其特定的需求来调整变量的位置，以提高访问效率或其他性能指标。因为硬件可以重新定位变量，所以我们在编写应用程序时并不知道每个uniform变量的具体偏移量。这导致我们无法直接且准确地填充UBO，因为我们不知道uniform变量在缓冲区中的确切位置。为了知道每个uniform变量的偏移量，我们可以使用像 `glGetUniformIndices` 这样的 OpenGL 函数来查询这些信息。但是，我们可以使用更简单易用的方法：使用**std140**布局。

`std140` 是 OpenGL 中一种用于定义Uniform Block内存布局的标准。它确保了在不同平台和实现中，统一块内的数据排列方式是一致的，从而保证了数据访问的正确性和性能。

std140中有两个关键概念，**基础对齐base alignment**和**对齐偏移量alignment offset**。每个变量都有一个基础对齐，这个对齐等于在uniform block中变量占用的空间（包括任何填充）。基础对齐的具体规则根据变量的类型而有所不同。

- `float`、`int`、`uint`：4 字节
- `vec2`：8 字节
- `vec3`、`vec4`：16 字节
- `mat2`：每列 8 字节，总共 16 字节
- `mat3`：每列 16 字节，总共 48 字节
- `mat4`：每列 16 字节，总共 64 字节
- `array`：数组元素的对齐方式与单个元素相同，且每个元素占据的空间按 16 字节对齐
- `struct`：结构体的对齐方式与其最大成员的对齐方式相同

而变量的对齐偏移量是从统一块开始计算的变量字节偏移量。这个偏移量必须是变量基础对齐的倍数。为了满足变量的对齐要求，我们在计算偏移量时，需要考虑当前变量的大小和对齐要求，以确定下一个变量的起始位置。

我们结合上面提到的例子来理解一下：

```glsl
layout (std140) uniform ExampleBlock
{
    float value;
    vec3 vector;
    mat4 matrix;
    float values[3];
    bool boolean;
    int integer;
};
```

- `float value`
   - 基础对齐：4字节
   - 偏移量：0
   - 下一个变量可以放置的内存位置：0 + 4 = 4
- `vec3 vector`
   - 基础对齐：16字节
   - 偏移量：4 + 12 = 16（由于vec3的对齐是16字节，所以需要再float value后插入12个字节的填充）
   - 下一个变量可以放置的内存位置：16 + 16 = 32
- `mat4 matrix`
   - 基础对齐：16 x 4 = 64字节 （每列16字节，总共4列）
   - 偏移量：32
   - 下一个变量可以放置的内存位置：32 + 64 = 96
- `float values[3]`
  - 基础对齐：16字节（数组元素按16字节对齐）
  - 偏移量：96
  - 下一个变量可以放置的内存位置：96 + 16 * 3 = 144
- `bool boolean`
  - 基础对齐：4字节
  - 偏移量：144
  - 下一个变量可以放置的内存位置：144 + 4 = 148
- `int integer`
  - 基础对齐：4字节
  - 偏移量：148
  - 下一个变量可以放置的内存位置：148 + 4 = 152

所以，我们的ExampleBlock的内存格式如下所示：

```c++
layout (std140) uniform ExampleBlock
{
                     // base alignment  // aligned offset
    float value;     // 4               // 0 
    vec3 vector;     // 16              // 16  (offset must be multiple of 16 so 4->16)
    mat4 matrix;     // 16              // 32  (column 0)
                     // 16              // 48  (column 1)
                     // 16              // 64  (column 2)
                     // 16              // 80  (column 3)
    float values[3]; // 16              // 96  (values[0])
                     // 16              // 112 (values[1])
                     // 16              // 128 (values[2])
    bool boolean;    // 4               // 144
    int integer;     // 4               // 148
}; 
```

#### Using uniform buffers

现在，我们可以总结一下OpenGL中使用UBO的步骤

首先，在shader中定义一个uniform block，包含所需要的uniform变量，例如：

```c++
#version 330 core

layout(std140) uniform MyUniformBlock {
    mat4 model;
    mat4 view;
    mat4 projection;
    vec4 lightPosition;
};

void main() 
{
    // make use of these uniform variables
}
```

然后在OpenGL程序中，获取这个uniform block在shader中的索引，实际上就是为了让OpenGL程序在CPU端知道这个uniform block在GPU上的位置：

```c++
unsigned int uniformBlockIndex = glGetUniformBlockIndex(shaderProgram, "MyUniformBlock");
```

接下来，我们为该uniform block设置一个绑定点，它用于将UBO和shader中的uniform block链接在一起，通过这种方式，我们可以在多个着色器程序之间共享uniform buffer data。如下图所示：

![](advanced_glsl_binding_points.png)

```c++
unsigned int bindingPoint = 0;
glUniformBlockBinding(shaderProgram, uniformBlockIndex, bindingPoint);
```

下面我们就可以进行创建、绑定、分配内存了：

```c++
unsigned int ubo;
glGenBuffers(1, &ubo);
glBindBuffers(GL_UNIFORM_BUFFER, ubo);
glBufferData(GL_UNIFORM_BUFFER, sizeof(UniformBlockData), nullptr, GL_STATIC_DRAW);
glBindBuffers(GL_UNIFORM_BUFFER, 0);
```

其中，`sizeof(UniformBlockData)`需要我们根据std140布局进行计算。

配置好UBO后，我们需要将UBO绑定到之前设置的绑定点上。在这里，我们有两个选择，一个是绑定整个缓冲区对象到一个绑定点的`glBindBufferBase`，另一个是绑定缓冲区对象的一个指定范围到一个绑定点的`glBindBufferRange`。选择哪个函数取决于我们是否需要绑定整个uniform buffer还是只是其中一部分。如果你只需要绑定缓冲区的一部分，例如在大缓冲区中只使用一个子集的数据，那么使用`glBindBufferRange`会更加合适；否则，使用`glBindBufferBase`更为简单和直接。

```c++
glBindBufferBase(GL_UNIFORM_BUFFER, bindingPoint, ubo); 
// or 只将缓冲区对象的前两个mat4矩阵（例如，模型矩阵和视图矩阵）绑定到绑定点0
glBindBufferRange(GL_UNIFORM_BUFFER, 0, ubo, 0, 2 * sizeof(glm::mat4));
```

同时，我们还需要知道，不管是`glBindBufferBase`还是`glBindBufferRange`，绑定点的绑定不依赖于当前绑定的缓冲区对象，而是直接将指定的uniform buffer对象绑定到指定的绑定点。所以，即使我们通过`glBindBuffer(GL_UNIFORM_BUFFER, 0);` 取消了当前的绑定状态，也不会影响绑定点的绑定。

当我们需要更新uniform block中的变量值时，我们只需要绑定UBO，然后调用`glBufferSubData`进行更新即可：

```c++
glBindBuffer(GL_UNIFORM_BUFFER, ubo);
glBufferSubData(GL_UNIFORM_BUFFER, 0, sizeof(UniformBlockData), &data);
glBindBuffer(GL_UNIFORM_BUFFER, 0);
```

---

### Anti Aliasing

#### SSAA （Super-Sampling Anti-Aliasing）

SSAA的全称是超采样抗锯齿

##### 工作原理：

1. 高分辨率渲染：
   - 首先，将场景渲染到一个比目标分辨率更高的分辨率的帧缓冲区中。这个高分辨率通常是目标分辨率的2倍、4倍或更多倍。例如，如果目标分辨率是1920x1080，2x SSAA会在3840x2160的分辨率下进行渲染。
2. 多重采样：
   - 在高分辨率帧缓冲区中，每个像素被分成多个子像素进行采样。每个子像素会独立地进行着色计算。
3. 降采样：
   - 将高分辨率图像缩小到目标分辨率。这个过程通常使用盒式过滤（Box Filter）或更复杂的过滤方法来对高分辨率图像进行平均，从而生成最终的低分辨率图像。

##### 优点：

1. **高质量**：
   - SSAA能够显著减少图像中的锯齿现象，因为它在高分辨率下进行采样并进行降采样，从而平滑了图像边缘和纹理细节。
2. **适用广泛**：
   - SSAA适用于所有类型的锯齿，包括几何锯齿和纹理锯齿，因为它在渲染阶段处理整个图像。

##### 缺点：

1. **性能开销大**：
   - SSAA需要在更高的分辨率下渲染图像，这显著增加了计算和内存的需求。与标准分辨率渲染相比，SSAA的性能开销可能是其4倍或更多。
2. **显存需求高**：
   - 由于需要存储高分辨率的帧缓冲区，SSAA需要更多的显存，这对硬件资源要求较高。

#### MSAA

[**A Quick Overview of MSAA – The Danger Zone (wordpress.com)**](https://mynameismjp.wordpress.com/2012/10/24/msaa-overview/)

在理解MSAA之前，我们首先需要了解OpenGL光栅器的原理

顶点处理阶段（如顶点着色器）完成后，每个图元的顶点都已经被转换到屏幕空间坐标系中，并进行了各种变换（如模型、视图和投影变换）。其中，图元可以是点、线或三角形，而光栅化器负责处理这些图元，将其转换为片段。片段是比像素更细致的图像元素，每个片段包含颜色、深度和其他属性。这些片段最终会被片段着色器处理，决定每个像素的最终颜色和属性。

顶点坐标在经过各种变换后，通常是浮点数，可以有很高的精度，不受屏幕分辨率的限制。同时，屏幕分辨率决定了片段的数量和位置。例如，1080p分辨率下的屏幕有1920x1080个像素点，每个片段的坐标必须映射到这些离散的像素点上。也就是说，顶点坐标是连续的，而片段是离散的，通常一个顶点不会直接对应到一个片段，而是需要通过插值和其他方法来确定片段的位置。

**简而言之，光栅化器将几何数据转换为可以在屏幕上显示的像素数据，实现从矢量图形到位图图像的转换。**

![](anti_aliasing_rasterization.png)

上图是一个屏幕像素的网格，其中每个像素的中心包含一个采样点，用于确定像素是否被三角形覆盖。当光栅化完成后，我们在屏幕上看到的图像是这样的

![](anti_aliasing_rasterization_filled.png)

由于屏幕像素数量有限，有些像素会沿着图形边缘渲染，而有些则不会被渲染，结果就是边缘不平滑的图元，也就是锯齿

而MSAA的核心思想就是，对每个像素内的多个采样点进行覆盖测试，判断哪些采样点落在多边形的内部，而非单个采样点。如下图所示，4x MSAA会在每个像素内进行4个采样点的覆盖测试：

![](anti_aliasing_sample_points.png)

像素最终颜色由 4 个 Sample 的 Color 评估决定，形成抗锯齿效果

---

GPU上的光栅化管线以渲染图元的顶点作为输入，包括位于齐次坐标系上的顶点位置。这些顶点位置用于确定当前像素是否在屏幕上可见。而具体的判断依据是coverage和occlusion，或者称为覆盖测试或遮挡测试。

覆盖测试是判断一个图元是否覆盖了给定的像素，GPU中判断的依据是图元是否覆盖了位于像素中心的采样点，如下图所示：

![](coverage.png)

而遮挡测试则会告诉我们被图元覆盖的像素是否会被其他三角形遮挡，也就是判断像素的深度。depth buffer存储了每个像素位置上，距离相机最近的图元的深度值。当图元被光栅化时，

#### MSAA in OpenGL

