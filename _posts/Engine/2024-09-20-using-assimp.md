---
title: 使用Assimp导入模型
date: 2024-09-20 10:15 +0800
categories: [Engine, Evnia Engine Developing]
media_subpath: /assets/img/Engine/evnia/
math: false
---

> 本篇文章基于LearnOpenGL教程中的[*Model Loading*](https://learnopengl.com/Model-Loading/Assimp)章节

### Assimp

#### 初识Assimp

Assimp是一个3D项目中常用的第三方模型导入库，支持数十种不同的模型格式。当我们通过Assimp加载模型后，我们就可以从一个统一的数据结构中获取模型的数据，而无需关心模型本身的格式。

一个简化的Assimp数据结构示意如下所示：

![](assimpClasses.jpg)

我们再根据这个示意图简单拆解一下：

- 场景/模型的所有数据都被存储在*Scene*对象中，例如网格体和材质等。此外，*Scene*对象还能够索引根节点
- Assimp中的节点可以包含任意数量的子节点，每个节点负责记录存储在*scene*对象中的数据的索引
- *mesh*对象包含了渲染相关的所有相关数据，如顶点位置、法线、纹理坐标、*face*、以及材质
- 每个*mesh*对象会包含数个*face*对象，*face*表示一种渲染图元，如三角形、点、四边形等。一个*face*对象会包含组成对应图元的顶点的索引
- 此外，*mesh*还会关联*material*对象，后者包含了用于获取对象材质属性的函数，如颜色或贴图等。

#### 构建并配置Assimp

> 本篇博客只涉及Windows 11平台下的Cmake构建过程

> 我比较喜欢自行配置第三方库，也就是下载源码，构建完成后通过CMake导入到我的项目中，如果这样的做法不符合您的习惯或行业内的习惯，请指正

##### Build

首先，我们从[Github](https://github.com/assimp/assimp/tree/master)中将源码下载到本地

然后使用Cmake GUI构建一个Visual Studio项目，打开该项目并点击**Build**

我们需要的文件/文件夹如下：

- 根目录中的*include*目录中的*assimp*文件夹
- *build*目录中的*assimp*文件夹中的头文件，需要与其他头文件放在一个目录中
- *assimp.dll*
- *assimp.lib*

##### Confige

下面是在CMake工具链中配置时所需的CMake代码：

```cmake
# assimp
# ------
# 获取Assimp目录路径
set(ASSIMP_DIR "${CMAKE_SOURCE_DIR}/thirdParty/assimp")
# 连接Assimp的静态库
target_link_libraries(showCase PRIVATE "${ASSIMP_DIR}/lib/assimp-vc143-mt.lib")
# 获取Assimp头文件
target_include_directories(showCase PRIVATE "${ASSIMP_DIR}/include")
# 将Assimp动态库添加到可执行文件目录下
file(COPY "${CMAKE_SOURCE_DIR}/thirdParty/assimp/bin/assimp-vc143-mt.dll" DESTINATION "${CMAKE_BINARY_DIR}/bin")
```

### Mesh

> 我们将实现基于OpenGL的模型读取与载入

在使用Assimp载入模型之前，我们需要先明确用于接收Assimp载入的模型数据的对象，也就是我们接下来要定义的`Mesh`类。

`Mesh`对象会包含以下信息：

- 顶点，且每个顶点会包含位置、法线、纹理坐标等信息
- 索引绘制所需要的顶点索引
- 材质数据（以贴图的形式存在）

现在，我们可以给出定义的网格体的代码了：

```c++
struct Vertex
{
    glm::vec3 Position;
    glm::vec3 Normal;
    glm::vec2 TexCoords;
};

struct Texture
{
    unsigned int ID;
    string Type;
};

class Mesh
{
public:
    Mesh(vector<Vertex> vertices, vector<unsigned int> indices, vector<Texture> textures);

public:
    // mesh data
    vector<Vertex>       mVertices;
    vector<unsigned int> mIndices;
    vector<Texture>      mTextures;

private:
    void setupMesh();

private:
    // render data
    unsigned int mVertexArray;
    unsigned int mVertexBuffer;
    unsigned int mIndexArray;
};
```

可以看出，`Mesh`类并不复杂，我们在构造函数中提供构建一个`Mesh`所需要的数据，并调用`setupMesh()`，此函数用于初始化OpenGL绘制所需要的各种缓冲区。具体的实现我们就展示了。

---

### Model

现在，我们终于准备好使用Assimp载入模型了。我们用于处理模型的类是`Model`：

```c++
class Model
{
public:
    Model(char* path)
    {
        loadModel(path);
    }

private:
    void loadModel(string path);
    void processNode(aiNode* node, const aiScene* scene);
    Mesh processMesh(aiMesh* mesh, const aiScene* scene);
    vector<Texture> loadMaterialTextures(aiMaterial* mat, aiTexture type, string typeName);

private:
    // model data
    vector<Mesh> mMeshes;
    string mDirectory;
};
```

接下来，我们依次来实现各个函数。

首先是`loadModel()`，用于使用Assimp读取并载入模型，并创建一个*scene*对象。具体来说，我们需要声明一个Assimp::Importer对象，并调用它的函数`ReadFile()`：

```c++
Assimp::Importer importer;
const aiScene* scene = importer.ReadFile(path, aiProcess_Triangulate | aiProcess_FlipUVs);
```

需要注意的是，Assimp为我们提供了一些很有用的后处理选项，完整的选项我们可以参考[这里](https://github.com/assimp/assimp/blob/master/include/assimp/postprocess.h)

完整的`loadModel()`如下：

```c++
void loadModel(string path)
{
    Assimp::Importer importer;
    const aiScene* scene = importer.ReadFile(path, aiProcess_Triangulate | aiProcess_FlipUVs);

    if (!scene || scene->mFlags & AI_SCENE_FLAGS_INCOMPLETE || !scene->mRootNode)
    {
        cerr << "ERROR::ASSIMP::" << importer.GetErrorString() << '\n';
        return;
    }

    mDirectory = path.substr(0, path.find_last_of('/'));

    processNode(scene->mRootNode, scene);
}
```

由于Assimp采用了节点式的数据结构，我们需要创建一个递归函数，用于处理所有的节点：

```c++
void processNode(aiNode* node, const aiScene* scene)
{
    // process all the node's mesh (if any)
    for (unsigned int i = 0; i < node->mNumMeshes; i++)
    {
        aiMesh* mesh = scene->mMeshes[node->mMeshes[i]];
        mMeshes.push_back(processMesh(mesh, scene));
    }

    // then do the same for each of its children node
    for (unsigned int i = 0; i < node->mNumChildren; i++)
    {
        processNode(node->mChildren[i], scene);
    }
}
```

现在，我们只需要将`aiMesh`对象转换为我们自定义`Mesh`对象即可，也就是访问`aiMesh`中的所有相关属性，然后存储在我们的`Mesh`对象中：

```c++
Mesh processMesh(aiMesh* mesh, const aiScene* scene)
{
    // data to fill
    vector<Vertex> vertices;
    vector<unsigned int> indices;
    vector<Texture> textures;

    // walk through each of the mesh's vertices
    for (unsigned int i = 0; i < mesh->mNumVertices; i++)
    {
        Vertex vertex;
        glm::vec3 vector; // a place holder

        // position
        vector.x = mesh->mVertices[i].x;
        vector.y = mesh->mVertices[i].y;
        vector.z = mesh->mVertices[i].z;
        vertex.Position = vector;

        // normal
        if (mesh->HasNormals())
        {
            vector.x = mesh->mNormals[i].x;
            vector.y = mesh->mNormals[i].y;
            vector.z = mesh->mNormals[i].z;
            vertex.Normal = vector;
        }

        // texcoord
        if (mesh->mTextureCoords[0])
        {
            glm::vec2 vec; // a place holder
            vec.x = mesh->mTextureCoords[0][i].x;
            vec.y = mesh->mTextureCoords[0][i].y;
            vertex.TexCoords = vec;
        }
        else
            vertex.TexCoords = glm::vec2(0.0f);

        vertices.push_back(vertex);
    }

    // walk through each of the mesh's faces and retrieve the corresponding vertex indices
    for (unsigned int i = 0; i < mesh->mNumFaces; i++)
    {
        aiFace face = mesh->mFaces[i];
        for (unsigned int j = 0; j < face.mNumIndices; j++)
        {
            indices.push_back(face.mIndices[j]);
        }
    }

    // process material
    aiMaterial* material = scene->mMaterials[mesh->mMaterialIndex];
    // we assume a convention for sampler names in the shaders. Each diffuse texture should be named
    // as 'texture_diffuseN' where N is a sequential number ranging from 1 to MAX_SAMPLER_NUMBER.
    // Same applies to other texture as the following list summarizes:
    // diffuse: texture_diffuseN
    // specular: texture_specularN
    // normal: texture_normalN

    // 1. diffuse maps
    vector<Texture> diffuseMaps = loadMaterialTextures(material, aiTextureType_DIFFUSE, "texture_diffuse");
    textures.insert(textures.end(), diffuseMaps.begin(), diffuseMaps.end());
    // 2. specular maps
    vector<Texture> specularMaps = loadMaterialTextures(material, aiTextureType_SPECULAR, "texture_specular");
    textures.insert(textures.end(), specularMaps.begin(), specularMaps.end());
    // 3. normal maps
    std::vector<Texture> normalMaps = loadMaterialTextures(material, aiTextureType_HEIGHT, "texture_normal");
    textures.insert(textures.end(), normalMaps.begin(), normalMaps.end());
    // 4. height maps
    std::vector<Texture> heightMaps = loadMaterialTextures(material, aiTextureType_AMBIENT, "texture_height");
    textures.insert(textures.end(), heightMaps.begin(), heightMaps.end());

    // return a mesh object created from the extracted mesh data
    return Mesh(vertices, indices, textures);
}
```

有关于纹理和材质的部分，我会在后面与PBR材质一起补充完整。
