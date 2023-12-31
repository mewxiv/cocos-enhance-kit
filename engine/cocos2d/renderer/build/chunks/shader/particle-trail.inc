
precision mediump float;
#include <particle-common>
in vec3 a_position; // center position
in vec4 a_texCoord;  // x:index y:size zw:texcoord
in vec3 a_texCoord1; // xyz:velocity
in vec3 a_texCoord2;
in vec4 a_color;

#if CC_DRAW_WIRE_FRAME
    out vec3 vBarycentric;
#endif

vec4 vs_main() {
    highp vec4 pos = vec4(a_position, 1);
    vec4 velocity = vec4(a_texCoord1.xyz, 0);

#if !CC_USE_WORLD_SPACE
    pos = cc_matWorld * pos;
    velocity = cc_matWorld * velocity;
#endif

    float vertOffset = (a_texCoord.x - 0.5) * a_texCoord.y;
    vec3 camUp = normalize(cross(pos.xyz - cc_cameraPos.xyz, velocity.xyz));
    pos.xyz += camUp * vertOffset;
    pos = cc_matViewProj * pos;
    uv = a_texCoord.zw * mainTiling_Offset.xy + mainTiling_Offset.zw;;
    color = a_color;
#if CC_DRAW_WIRE_FRAME
    vBarycentric = a_texCoord2;
#endif
    return pos;
}
