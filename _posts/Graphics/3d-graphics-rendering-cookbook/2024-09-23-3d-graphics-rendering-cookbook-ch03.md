---
title: 3D Graphics Rendering Cookbook Chapter 03
date: 2024-09-23 22:51 +0800
categories: [Graphics, 3D Graphics Rendering Cookbook]
media_subpath: /assets/img/Graphics/3dcookbook/
math: true
---

### Working With Direct State Access (DSA)

在现代 OpenGL 中，直接状态访问（Direct State Access, DSA）提供了一种更加直观和简洁的方式来操作对象，比如纹理、缓冲区等，而不需要像早期 OpenGL 那样先绑定对象到上下文（绑定点），然后再执行操作。DSA 可以直接对对象进行操作，避免了频繁的绑定和解绑操作，提升了代码的可读性和性能。

DSA函数根据对象分为下面几类：

- Texture
- Framebuffer
- Buffer
- Transform feedback
- Vertex Array
- Sampler
- Query
- Program

我们会逐一了解每个类型在DSA下的使用方式，从而更好地理解DSA这个特性。

#### Texture

1. 使用DSA，可以通过`glCreateTextures`来创建一个或多个texture对象，并且会在创建时中指定纹理目标，而不需要像传统OpenGL中先绑定到GL_TEXTURE_2D等目标：

   ```c++
   GLuint texture;
   glCreateTextures(GL_TEXTURE_2D, 1, &texture);
   ```

2. 在DSA中，可以直接调用`glTextureParameter`来设置纹理参数，而无需先绑定纹理对象：

   ```c++
   glTextureParameteri(texture, GL_TEXTURE_WRAP_S, GL_REPEAT);
   glTextureParameteri(texture, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
   ```

3. 在传统OpenGL中，我们需要通过`glTexImage2D`等函数指定纹理数据，而在DSA中，我们使用`glTextureStorage2D`来分配存储，使用`glTextureSubImage2D`来更新纹理数据

   ```c++
   glTextureStorage2D(texture, 1, GL_RGBA8, width, height);
   glTextureSubImage2D(texture, 0, 0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, data);
   ```

4. 尽管DSA可以减少绑定的操作，但是在实际渲染中，纹理仍然需要绑定到纹理单元。在传统OpenGL中，我们使用`glActiveTexture`与`glBindTexture`进行绑定，而在DSA中，通过glBindTextureUnit就可以直接将纹理绑定到指定的纹理单元：

   ```c++
   glBindTextureUnit(0, texture);
   ```

5. 在生成mipmap时，DSA也可以省略掉绑定的过程：

   ```c++
   glGenterateTextureMipmap(GLuint texture);
   ```

[***这里***](https://github.com/nscTechArt/3d-graphics-rendering-cookbook/blob/main/sandbox/Chapter02/03_STB/src/main.cpp)是一个使用DSA绘制纹理的例子

#### Buffer

在DSA中，我们通过`glCreateBuffers`来创建一个或多个buffer对象。需要注意的是，使用`glCreateBuffers`不需要像`glCreateTextures`那样指定纹理对象的类型，这意味着创建的buffer用于任意的类型，例如，我们通过一个compute shader在GPU上填充了一个shader storage buffer，该buffer后续也可以作为绘制命令的indirect buffer。

我们下面来看一个例子：

1. 创建一个uniform buffer对象：

   ```c++
   struct PerFrameData
   {
       glm::mat4 mvp;
       int isWireframe;
   };
   
   ...
   
   const GLsizeiptr kBufferSize = sizeof(PerFrameData);
   GLuint uniformBuffer;
   glCreateBuffer(1, &uniformBuffer);
   ```

2. 接下来，我们需要为该buffer分配存储空间，这里我们使用`GL_DYNAMIC_STORAGE_BIT`来表明该buffer的大小与分配模式是不可改变的，但同时仍然可以更新buffer中数据

   ```c++
   glNamedBufferStorage(uniformBuffer, kBufferSize, nullptr, GL_DYNAMIC_STORAGE_BIT);
   ```

3. 在DSA中，我们可以通过glNamedBufferSubData直接更新buffer中的数据，而无需先绑定再操作

   ```c++
   glNamedBufferSubData(uniformBuffer, 0, kBufferSize, data);
   ```

4. 虽然 DSA 消除了大量的绑定操作，但在某些情况下仍需要将缓冲区绑定到特定目标，如绑定到顶点数组对象（VAO）或用于索引绘制。可以通过 `glBindBufferBase` 或 `glBindBufferRange` 直接绑定缓冲区到指定的绑定点。

   ```cpp
   glBindBufferRange(GL_UNIFORM_BUFFER, 0, uniformBuffer, 0, kBufferSize);
   ```

完整的代码在[***这里***](https://github.com/nscTechArt/3d-graphics-rendering-cookbook/blob/main/sandbox/Chapter02/07_Assimp/src/main.cpp)

至于其他类型在DSA中的使用，我们会逐步更新

---

### Implementing programmable vertex pulling (PVP) in OpenGL

这部分我暂时不能复现教程中的效果，等我后面再更新吧

下面是一些参考资料：

- [nlguillemot/ProgrammablePulling: Programmable pulling experiments (based on OpenGL Insights "Programmable Vertex Pulling" article by Daniel Rakos) (github.com)](https://github.com/nlguillemot/ProgrammablePulling)
- 

---

### Working with cube map textures

cubemap包含了六张二维纹理，这些纹理分别代表cube的一个面。cubemap一个重要的特性是可以使用方向向量对其进行采样。当我们想要表示场景中来自各个方向的光照时，这个特性就尤为方便。在后面的章节中，我们会将PBR光照计算中的漫反射部分，存储在一个irrddiance cubemap中。

在游戏引擎和渲染器中，cubemap通常会作为等距矩形投影或者十字形式导入，在本节中，我们会详细探讨导入cubemap并实现光照计算的的完整过程。

#### Get ready

我们实现一个`Bitmap`类，用于处理应用程序中图像数据。它支持二维贴图与立方体贴图，能够根据图片的类型选择对应的载入和读取功能。具体的实现在[***这里***](https://github.com/nscTechArt/3d-graphics-rendering-cookbook/blob/main/shared/src/bitmap.cpp)

#### How to do it...

首先我们将cubemap从等距矩形纹理转换为竖直方向的十字架形式。

如果，我们从等距矩形纹理的每个像素直接计算立方体贴图面的位置，可能会因为不恰当的像素映射造成图像细节的失真。这种失真通常表现为摩尔纹。所以，建议的做法是先创建立方体贴图的六个面，然后对立方体贴图的每个像素计算它在等距矩形纹理的对应位置，使用双线性插值获取颜色值。

具体的步骤如下：

1. 首先引入一个helper函数，用于将立方体贴图中的一个特定面上的整数坐标映射到归一化的浮点数坐标：

   ```c++
   vec3 faceCoordsToXYZ(int i, int j, int faceID, int faceSize)
   {
       // transfers the texcoords of the give face into
       // xyz coordinates in 3D space
       // ---------------------------------------------
   
       // remap coordinates to the range [0, 2]
       // ------------------------------------------
       const float A = 2.0f * float(i) / faceSize;
       const float B = 2.0f * float(j) / faceSize;
   
       // remap coordinate to 3D space
       // ----------------------------
       if (faceID == 0) return vec3(-1.0f, A - 1.0f, B - 1.0f); // left
   	if (faceID == 1) return vec3(A - 1.0f, -1.0f, 1.0f - B); // bottom
   	if (faceID == 2) return vec3(1.0f, A - 1.0f, 1.0f - B);  // right
   	if (faceID == 3) return vec3(1.0f - A, 1.0f, 1.0f - B);  // top
   	if (faceID == 4) return vec3(B - 1.0f, A - 1.0f, 1.0f);  // front
   	if (faceID == 5) return vec3(1.0f - B, A - 1.0f, -1.0f); // back
   
       // invalid face index should return a zero vector
       // ----------------------------------------------
   	return vec3();
   }
   ```

2. 接下来我们实现将立方体贴图从等距矩形纹理到竖直方向的十字形式的转换（推理的过程可以参考[***这里***](https://stackoverflow.com/a/29681646)）：

   ```c++
   Bitmap convertEquirectangularMapToVerticalCross(const Bitmap& bitmap)
   {
       // equirec tangular map must be a 2D texture
       // -----------------------------------------
       if (bitmap.mType != BitmapType_2D) return Bitmap();
   
       // vertical cross cubemap consists 4 rows and 3 columns
       // ----------------------------------------------------
       const int faceSize = bitmap.mWidth / 4;
       const int crossImageWidth = faceSize * 3;
       const int crossImageHeight = faceSize * 4;
       Bitmap result(crossImageWidth, crossImageHeight, bitmap.mChannels, bitmap.mFormat);
   
       // the following points define the locations of individual faces inside the cross
       // ------------------------------------------------------------------------------
       const ivec2 kFaceOffset[] =
       {
           ivec2(faceSize, faceSize * 3),
           ivec2(0, faceSize),
           ivec2(faceSize, faceSize),
           ivec2(faceSize * 2, faceSize),
           ivec2(faceSize, 0),
           ivec2(faceSize, faceSize * 2)
       };
   
       // two constants will be necessary to clamp the texture lookup
       // -----------------------------------------------------------
       const int clampWidth = bitmap.mWidth - 1;
       const int clampHeight = bitmap.mHeight - 1;
   
       // iterates over the six cube map faces and each pixel inside each face
       // --------------------------------------------------------------------
       for (int face = 0; face != 6; face++)
       {
           for (int i = 0; i != faceSize; i++)
           {
               for (int j = 0; j != faceSize; j++)
               {
                   // use trigonometry functions to calculate the
                   // latitude and longtitude coordinates of the Cartesian coords
                   const vec3 p = faceCoordsToXYZ(i, j, face, faceSize);
                   const float r = hypot(p.x, p.y);
                   const float theta = atan2(p.y, p.x);
                   const float phi = atan2(p.z, r);
                   // map the latitude and longtitude of the floating-point coordinate
                   // inside the equirectangular image
                   const float u = float(2.0f * faceSize * (theta + M_PI) / M_PI);
                   const float v = float(2.0f * faceSize * (M_PI / 2.0f - phi) / M_PI);
                   // based on these floating-point coordinates, we can get two pairs
                   // of integer UV coordinates,
                   // which will be used to sample for textures for bilinear interpolation
                   const int u1 = std::clamp(int(floor(u)), 0, clampWidth);
                   const int u2 = std::clamp(u1 + 1, 0, clampWidth);
                   const int v1 = std::clamp(int(floor(v)), 0, clampHeight);
                   const int v2 = std::clamp(v1 + 1, 0, clampHeight);
                   // get the fraction part for bilinear interpolation
                   const float s = u - u1;
                   const float t = v - v1;
                   // fetch four samples
                   const vec4 A = bitmap.getPixel(u1, v1);
                   const vec4 B = bitmap.getPixel(u2, v1);
                   const vec4 C = bitmap.getPixel(u1, v2);
                   const vec4 D = bitmap.getPixel(u2, v2);
                   // bilinear interpolation
                   const vec4 color =
                       A * (1 - s) * (1 - t) + B * s * (1 - t) + C * (1 - s) * t + D * s * t;
                   result.setPixel(i + kFaceOffset[face].x, j + kFaceOffset[face].y, color);
               }
           }
       }
   
       return result;
   }
   ```

3. 然后，我们实现切分十字形式的立方体贴图

   ```c++
   Bitmap convertVerticalCrossToCubeMapFaces(const Bitmap& bitmap)
   {
       // the layout of this vertical cross image
       // ---------------------------------------
       //          ------
       //			| +Y |
       //     ----------------
       //     | -X | -Z | +X |
       //     ----------------
       //			| -Y |
       //			------
       //			| +Z |
       //			------
       const int faceWidth = bitmap.mWidth / 3;
       const int faceHeight = bitmap.mHeight / 4;
       Bitmap cubemap(faceWidth, faceHeight, 6, bitmap.mChannels, bitmap.mFormat);
   
       // set up pointers to read and write the data
       // ------------------------------------------
       const uint8_t* src = bitmap.mData.data();
       uint8_t* dst = cubemap.mData.data();
       const int pixelSize = cubemap.mChannels * Bitmap::getBytePerChannel(cubemap.mFormat);
   
       // iterate over the faces and over every pixel of each face
       // --------------------------------------------------------
       for (int face = 0; face != 6; ++face)
       {
           for (int j = 0; j != faceHeight; ++j)
           {
               for (int i = 0; i != faceWidth; ++i)
               {
                   int x = 0;
                   int y = 0;
                   // calculate the source pixel position in the vertical cross layout
                   // based on the destination cube map face index
                   switch (face)
                   {
                       case 0: // GL_TEXTURE_CUBE_MAP_NEGATIVE_X
                           x = i;
                           y = faceHeight + j;
                           break;
                       case 1: // GL_TEXTURE_CUBE_MAP_POSITIVE_X
                           x = 2 * faceWidth + i;
                           y = 1 * faceHeight + j;
                           break;
                       case 2: // GL_TEXTURE_CUBE_MAP_POSITIVE_Y
                           x = 2 * faceWidth - (i + 1);
                           y = 1 * faceHeight - (j + 1);
                           break;
                       case 3: // GL_TEXTURE_CUBE_MAP_NEGATIVE_Y
       					x = 2 * faceWidth - (i + 1);
       					y = 3 * faceHeight - (j + 1);
       					break;
       				case 4: // GL_TEXTURE_CUBE_MAP_POSITIVE_Z
       					x = 2 * faceWidth - (i + 1);
       					y = bitmap.mHeight - (j + 1);
       					break;
       				case 5: // GL_TEXTURE_CUBE_MAP_NEGATIVE_Z
       					x = faceWidth + i;
       					y = faceHeight + j;
       					break;
                   }
                   // copy the pixel and advance to the next one
                   memcpy(dst, src + (y * bitmap.mWidth + x) * pixelSize, pixelSize);
                   dst += pixelSize;
               }
           }
       }
       return cubemap;
   }
   ```

4. 现在，我们应该在应用程序中通过`stbi_loadf`来载入我们的HDR图片了：

   ```c++
   int imageWidth, imageHeight, channels;
   const float* image = stbi_loadf("../../assets/hdr/piazza_bologni_1k.hdr", &imageWidth, imageHeight, &channels, 3);
   Bitmap in(imageWidth, imageHeight, channels, BitmapFormat_Float, image);
   stbi_image_free((void*)image);
   ```

5. 然后我们就可以将原hdr图片从全景转换为竖直方向的十字形式了，我们可以将它也保存为一个hdr格式的图片，以便于我们在应用程序之外检查：

   ```
   
   ```

   
