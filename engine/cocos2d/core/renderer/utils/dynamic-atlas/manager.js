// const Atlas = require('./atlas');
import { Atlas, Rect } from './reusable-atlas';

let _atlases = [];
let _atlasIndex = -1;

let _maxAtlasCount = -1;
let _textureSize = 2048;
let _maxFrameSize = 512;
let _textureBleeding = true;
let _autoMultiBatch = true;
let _autoResetBeforeSceneLoad = true;

let _debugNode = null;

function newAtlas () {
    let atlas = _atlases[++_atlasIndex]
    if (!atlas) {
        atlas = new Atlas(_textureSize, _textureSize);
        _atlases.push(atlas);
        if (dynamicAtlasManager.autoMultiBatch) cc.sp.multiBatcher.requsetMaterial(atlas._texture);
    }
    return atlas;
}

function beforeSceneLoad() {
    if (_autoResetBeforeSceneLoad) {
        dynamicAtlasManager.reset();
    }
}

let _enabled = false;

/**
 * !#en Manage Dynamic Atlas Manager. Dynamic Atlas Manager is used for merging textures at runtime, see [Dynamic Atlas](https://docs.cocos.com/creator/2.4/manual/en/advanced-topics/dynamic-atlas.html) for details.
 * !#zh 管理动态图集。动态图集用于在运行时对贴图进行合并，详见 [动态合图](https://docs.cocos.com/creator/2.4/manual/zh/advanced-topics/dynamic-atlas.html)。
 * @class DynamicAtlasManager
 */
let dynamicAtlasManager = {
    Atlas: Atlas,
    Rect: Rect,

    /**
     * !#en Enable or disable the dynamic atlas, see [Dynamic Atlas](https://docs.cocos.com/creator/2.4/manual/en/advanced-topics/dynamic-atlas.html) for details.
     * !#zh 开启或者关闭动态图集，详见 [动态合图](https://docs.cocos.com/creator/2.4/manual/zh/advanced-topics/dynamic-atlas.html)。
     * @property enabled
     * @type {Boolean}
     */
    get enabled() {
        return _enabled;
    },
    set enabled(value) {
        if (_enabled === value) return;

        if (value) {
            this.reset();
            cc.director.on(cc.Director.EVENT_BEFORE_SCENE_LAUNCH, beforeSceneLoad);
        }
        else {
            cc.director.off(cc.Director.EVENT_BEFORE_SCENE_LAUNCH, beforeSceneLoad);
        }

        _enabled = value;
    },

    /**
     * !#en The maximum number of atlas that can be created.
     * !#zh 可以创建的最大图集数量。
     * @property maxAtlasCount
     * @type {Number}
     */
    get maxAtlasCount() {
        return _maxAtlasCount;
    },
    set maxAtlasCount(value) {
        _maxAtlasCount = value;
    },

    /**
     * !#en Get the current created atlas count.
     * !#zh 获取当前已经创建的图集数量。
     * @property atlasCount
     * @type {Number}
     */
    get atlasCount() {
        return _atlases.length;
    },

    /**
     * !#en Is enable textureBleeding.
     * !#zh 是否开启 textureBleeding
     * @property textureBleeding
     * @type {Boolean}
     */
    get textureBleeding() {
        return _textureBleeding;
    },

    set textureBleeding(enable) {
        _textureBleeding = enable;
    },

    /**
     * !#en The size of the atlas that was created
     * !#zh 创建的图集的宽高
     * @property textureSize
     * @type {Number}
     */
    get textureSize() {
        return _textureSize;
    },
    set textureSize(value) {
        _textureSize = value;
    },

    /**
     * !#en The maximum size of the picture that can be added to the atlas.
     * !#zh 可以添加进图集的图片的最大尺寸。
     * @property maxFrameSize
     * @type {Number}
     */
    get maxFrameSize() {
        return _maxFrameSize;
    },
    set maxFrameSize(value) {
        if (value > _textureSize) value = _textureSize;
        _maxFrameSize = value;
    },

    /**
     * !#en Is enable autoMultiBatch.
     * !#zh 是否开启自动多纹理合批
     * @property autoMultiBatch
     * @type {Boolean}
     */
    get autoMultiBatch() {
        return _autoMultiBatch;
    },

    set autoMultiBatch(enable) {
        if (_autoMultiBatch === enable) return;

        if (enable) {
            for (let i = 0, l = _atlases.length; i < l; i++) {
                cc.sp.multiBatcher.requsetMaterial(_atlases[i]._texture);
            }
        }

        _autoMultiBatch = enable;
    },

    /**
     * !#en Is enable autoResetBeforeSceneLoad.
     * !#zh 是否在场景切换时清空所有图集
     * @property autoResetBeforeSceneLoad
     * @type {Boolean}
     */
    get autoResetBeforeSceneLoad() {
        return _autoResetBeforeSceneLoad;
    },

    set autoResetBeforeSceneLoad(enable) {
        if (_autoResetBeforeSceneLoad === enable) return;
        _autoResetBeforeSceneLoad = enable;
    },

    /**
     * !#en atlases
     * !#zh 图集数组
     * @property atlases
     * @type {Atlas}
     */
    get atlases() {
        return _atlases;
    },

    /**
     * 已用空间集合
     */
    rects: Object.create(null),

    /**
     * !#en The minimum size of the picture that can be added to the atlas.
     * !#zh 可以添加进图集的图片的最小尺寸。
     * @property minFrameSize
     * @type {Number}
     * @deprecated
     */

    /**
     * !#en Append a sprite frame into the dynamic atlas.
     * !#zh 添加碎图进入动态图集。
     * @method insertSpriteFrame
     * @param {SpriteFrame} spriteFrame
     * @return {Object} frame
     */
    insertSpriteFrame(spriteFrame) {
        if (CC_EDITOR) return null;
        if (!_enabled || !spriteFrame || spriteFrame._original) return null;

        let atlas, frame;

        // 是否贴图已经在图集中
        let rect = spriteFrame._rect,
            texture = spriteFrame._texture,
            info = this.rects[texture._uuid];

        let sx = rect.x, sy = rect.y;

        if (info) {
            sx += info.x;
            sy += info.y;

            info.spriteFrames.push(spriteFrame);

            frame = {
                x: sx,
                y: sy,
                texture: info.atlas._texture,
            };

            return frame;
        }

        // 尝试加入已有图集
        for (let i = 0; i <= _atlasIndex; i++) {
            atlas = _atlases[i];
            frame = atlas.insertSpriteFrame(spriteFrame);
            if (frame) {
                return frame;
            }
        }

        // 创建新图集尝试加入
        if (_atlasIndex + 1 < _maxAtlasCount) {
            atlas = newAtlas();
            return atlas.insertSpriteFrame(spriteFrame);
        }

        return frame;
    },

    /**
     * !#en Delete a sprite frame from the dynamic atlas.
     * !#zh 使精灵帧取消使用动态图集
     * @method deleteSpriteFrame
     * @param {SpriteFrame} spriteFrame
     */
    deleteSpriteFrame(spriteFrame) {
        if (spriteFrame && !CC_TEST) {
            if (spriteFrame._original) {
                this.deleteAtlasSpriteFrame(spriteFrame);
                spriteFrame._resetDynamicAtlasFrame();
            }
        }
    },

    /**
     * !#en Delete a texture from the dynamic atlas.
     * !#zh 从动态图集删除该贴图，使用该贴图的精灵帧会被还原
     * @method deleteTexture
     * @param {Texture2D} texture
     */
    deleteTexture(texture) {
        this.deleteAtlasTexture(texture);
    },

    /**
     * !#en Resets all dynamic atlas, and the existing ones will be destroyed.
     * !#zh 重置所有动态图集，已有的动态图集会被销毁。
     * @method reset
    */
    reset () {
        for (let i = 0, l = _atlases.length; i < l; i++) {
            _atlases[i].destroy();
        }
        _atlases.length = 0;
        _atlasIndex = -1;
    },

    deleteAtlasSpriteFrame (spriteFrame) {
        if (!spriteFrame._original) return;

        let texture = spriteFrame._original._texture;
        for (let i = _atlases.length - 1; i >= 0; i--) {
            if (_atlases[i].deleteSpriteFrame(texture, spriteFrame)) {
                return;
            }
        }
    },

    deleteAtlasTexture (texture) {
        if (texture) {
            for (let i = _atlases.length - 1; i >= 0; i--) {
                if (_atlases[i].deleteInnerTexture(texture, true)) {
                    return;
                }
            }
        }
    },

    /**
     * !#en Displays all the dynamic atlas in the current scene, which you can use to view the current atlas state.
     * !#zh 在当前场景中显示所有动态图集，可以用来查看当前的合图状态。
     * @method showDebug
     * @param {Boolean} show
     * @return {Node}
     */
    showDebug (show) {
        if (show) {
            if (!_debugNode || !_debugNode.isValid) {
                let width = cc.visibleRect.width;
                let height = cc.visibleRect.height;

                _debugNode = new cc.Node('DYNAMIC_ATLAS_DEBUG_NODE');
                _debugNode.width = width;
                _debugNode.height = height;
                _debugNode.x = width/2;
                _debugNode.y = height/2;
                _debugNode.zIndex = cc.macro.MAX_ZINDEX;
                _debugNode.parent = cc.director.getScene();

                _debugNode.groupIndex = cc.Node.BuiltinGroupIndex.DEBUG;
                cc.Camera._setupDebugCamera();

                let scroll = _debugNode.addComponent(cc.ScrollView);

                let content = new cc.Node('CONTENT');
                let layout = content.addComponent(cc.Layout);
                layout.type = cc.Layout.Type.VERTICAL;
                layout.resizeMode = cc.Layout.ResizeMode.CONTAINER;
                content.parent = _debugNode;
                content.width = _textureSize;
                content.anchorY = 1;
                content.x = _textureSize;

                scroll.content = content;

                for (let i = 0; i <= _atlasIndex; i++) {
                    let node = new cc.Node('ATLAS');

                    let texture = _atlases[i]._texture;
                    let spriteFrame = new cc.SpriteFrame();
                    spriteFrame.setTexture(_atlases[i]._texture);

                    let sprite = node.addComponent(cc.Sprite);
                    sprite.spriteFrame = spriteFrame;

                    node.parent = content;
                }
            }
            return _debugNode;
        }
        else {
            if (_debugNode) {
                _debugNode.parent = null;
                _debugNode = null;
            }
        }
    },

    update () {
        if (!this.enabled) return;

        for (let i = 0; i <= _atlasIndex; i++) {
            _atlases[i].update();
        }
    },
};

/**
 * @module cc
 */

/**
 * @property dynamicAtlasManager
 * @type DynamicAtlasManager
 */
module.exports = cc.dynamicAtlasManager = dynamicAtlasManager;
