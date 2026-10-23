var SuperRailBuilderVersion = "1.5";

var renderClass = "jp.ngt.rtm.render.VehiclePartsRenderer";
importPackage(Packages.org.lwjgl.opengl);
importPackage(Packages.org.lwjgl.input);
importPackage(Packages.jp.ngt.rtm.render);

//MCTE

//NGTLib
importPackage(Packages.jp.ngt.ngtlib.io); //NGTLog
importPackage(Packages.jp.ngt.ngtlib.util); //NGTUtilClient MCWrapper MCWrapperClient
importPackage(Packages.jp.ngt.ngtlib.block); //BlockUtil
importPackage(Packages.jp.ngt.ngtlib.math); //Vec3 NGTMath

//RealTrainMod
importPackage(Packages.jp.ngt.rtm); //RTMCore RTMItem RTMResource RTMBlock
importPackage(Packages.jp.ngt.rtm.rail.util); //RailPosition RailDir
importPackage(Packages.jp.ngt.rtm.rail); //TileEntityLargeRailBase
importPackage(Packages.jp.ngt.rtm.item); //ItemRail
if (!isOldVer) importPackage(Packages.jp.ngt.rtm.modelpack.state); //ResourceStateRail

//Minecraft
importPackage(Packages.net.minecraft.tileentity); //TileEntitySign

var isOldVer = RTMCore.VERSION.indexOf("1.7.10") >= 0;
var isKaizPatch = RTMCore.VERSION.indexOf("KaizPatch") !== -1;
var startMarkerData = new java.util.WeakHashMap();
var endMarkerData = new java.util.WeakHashMap();
var switchMarkerData = new java.util.WeakHashMap();
var splitRailData = new java.util.WeakHashMap();
var midPosData = new java.util.WeakHashMap();
var snapPosListData = new java.util.WeakHashMap();
var transitionCurveBezierData = new java.util.WeakHashMap();

//##----------------##
//##    Settings    ##
//##----------------##

//キーの長押しを判定する時間(秒)
var continueKeyDownTime = 0.2;

//カーソルの限界距離(上限はRTM/Minecraftの仕様に依存します)
var cursorMaxDistance = 512;

//レールのズレ許容精度のリスト(m)
var railPosAccuracyList = [0.03125, 0.0625, 0.125]; // 1/32, 1/16, 1/8

//デフォルトのレールのズレ許容精度
var defaultRailPosAccuracy = 0.03125;

//レール上を選択するとき、端部にスナップする距離
var railSnapDistance = 5.0;

//レールの幅の一覧
var railGuageList = {
  guage762: { guage: 762, name: "762mm", maxCant: 65, deficiency: 70 },
  guage1067: { guage: 1067, name: "1067mm", maxCant: 105, deficiency: 70 },
  guage1372: { guage: 1372, name: "1372mm", maxCant: 150, deficiency: 70 },
  guage1435: { guage: 1435, name: "1435mm", maxCant: 200, deficiency: 90 },
  guageMonorail: { guage: 1000, name: "1000mm", maxCant: 110, deficiency: 50 }
};

//デフォルトのカント量計算に使うレール幅
var defaultRailGuage = "guage1067";

//カント設定の増減量
var cantValue = 5;

//カーブと判定する最大のカーブ半径(これ以上大きいカーブ半径は直線扱い)
var maxCurveRadius = 9999;

//カーブ線プレビューの長さ(m)
var maxCurveLength = 100;

//複線補助線の間隔
var sideRailWidth = 4.0;

//複線補助線の数
var sideRailAmount = 1;

//キー設定
var KeyMaps = {
  //オプションキー
  optionKey: Keyboard.KEY_LCONTROL,

  //Y座標オフセット変更/レール高さ変更(+オプション)
  offsetYUp: Keyboard.KEY_UP,
  offsetYDown: Keyboard.KEY_DOWN,

  //Y座標オフセットをリセット/Y座標オフセットをスナップ(+オプション)
  resetOffsetY: Keyboard.KEY_F,

  //カント量設定 / ゲージ変更(+オプション)
  cantL: Keyboard.KEY_LEFT,
  cantR: Keyboard.KEY_RIGHT,

  //線路を生成する
  build: Keyboard.KEY_RETURN,

  //マーカー全削除
  allDelete: Keyboard.KEY_C,

  //レールの精度変更
  changePointAccuracy: Keyboard.KEY_P,

  //分岐作成時に対象マーカーを切り替える
  changeMarker: Keyboard.KEY_O,

  //レール生成時にブロックを下に置く
  isSetUnderBlock: Keyboard.KEY_I,

  //選択したレールを削除
  deleteRail: Keyboard.KEY_DELETE,

  //ヘルプのON/OFF
  isHideHelp: Keyboard.KEY_H,

  //終了
  endEdit: Keyboard.KEY_Q
};
//--  Settings END  --

var langList = ["en_us", "ja_jp"];

function init(par1, par2) {
  body = renderer.registerParts(new Parts("body"));
  selectBlock = renderer.registerParts(new Parts("selectBlock"));
  selectCursor = renderer.registerParts(new Parts("selectCursor"));
  selectableCursor = renderer.registerParts(new Parts("selectableCursor"));
  selectedCursor = renderer.registerParts(new Parts("selectedCursor"));
  selectCursorMarker = renderer.registerParts(new Parts("selectCursorMarker"));
  selectedCursorMarker = renderer.registerParts(
    new Parts("selectedCursorMarker")
  );
  snapCursorMarker = renderer.registerParts(new Parts("snapCursorMarker"));
  dirMarker = []; //marker0～marker7
  for (var i = 0; i <= 15; i++) {
    dirMarker[i] = renderer.registerParts(new Parts("marker" + i));
  }
  selectedLine = renderer.registerParts(new Parts("selectedLine"));
  anchorLine = renderer.registerParts(new Parts("anchorLine"));
  offsetYLine = renderer.registerParts(new Parts("offsetYLine"));
  offsetYLine_ground = renderer.registerParts(new Parts("offsetYLine_ground"));
  previewLine1 = renderer.registerParts(new Parts("previewLine1"));
  previewLine2 = renderer.registerParts(new Parts("previewLine2"));
  previewAnchorLine = renderer.registerParts(new Parts("previewAnchorLine"));
  cantLine = renderer.registerParts(new Parts("cantLine"));
  connectLine = renderer.registerParts(new Parts("connectLine"));
  deleteLine = renderer.registerParts(new Parts("deleteLine"));
  auxiliaryLine = renderer.registerParts(new Parts("auxiliaryLine"));

  distancePanel_D = renderer.registerParts(new Parts("distancePanel_D"));
  distancePanel_M = renderer.registerParts(new Parts("distancePanel_M"));
  distancePanel = [];
  cantPanel_angle = renderer.registerParts(new Parts("cantPanel_angle"));
  cantPanel_mm = renderer.registerParts(new Parts("cantPanel_mm"));
  cantPanel = [];
  curvePanel_Radius = renderer.registerParts(new Parts("curvePanel_Radius"));
  curvePanel_L = renderer.registerParts(new Parts("curvePanel_L"));
  curvePanel_R = renderer.registerParts(new Parts("curvePanel_R"));
  curvePanel_m = renderer.registerParts(new Parts("curvePanel_m"));
  curvePanel = [];
  slopePanel_slope = renderer.registerParts(new Parts("slopePanel_slope"));
  slopePanel_permil = renderer.registerParts(new Parts("slopePanel_permil"));
  slopePanel = [];
  posXPanel_X = renderer.registerParts(new Parts("posXPanel_X"));
  posXPanel = [];
  posZPanel_Z = renderer.registerParts(new Parts("posZPanel_Z"));
  posZPanel = [];
  for (var i = 0; i <= 9; i++) {
    distancePanel[i] = renderer.registerParts(new Parts("distancePanel_" + i));
    cantPanel[i] = renderer.registerParts(new Parts("cantPanel_" + i));
    curvePanel[i] = renderer.registerParts(new Parts("curvePanel_" + i));
    slopePanel[i] = renderer.registerParts(new Parts("slopePanel_" + i));
    posXPanel[i] = renderer.registerParts(new Parts("posXPanel_" + i));
    posZPanel[i] = renderer.registerParts(new Parts("posZPanel_" + i));
  }

  help = {};
  langList.forEach(function (lang) {
    help[lang] = [];
    for (var i = 0; i <= 13; i++) {
      help[lang][i] = renderer.registerParts(
        new Parts("help" + i + "_" + lang)
      );
    }
  });

  debugMarker = renderer.registerParts(new Parts("debugMarker"));
  debugLine = renderer.registerParts(new Parts("debugLine"));
}

function render(entity, pass, par3) {
  if (pass !== 0) return;

  GL11.glPushMatrix();
  body.render(renderer);
  GL11.glPopMatrix();
  if (!entity) return;

  var dataMap = entity.getResourceState().getDataMap();
  var isOpenGUI = NGTUtilClient.getMinecraft().field_71462_r !== null;
  var world = entity.field_70170_p;
  var posX = MCWrapper.getPosX(entity);
  var posY = MCWrapper.getPosY(entity);
  var posZ = MCWrapper.getPosZ(entity);

  var player = MCWrapperClient.getPlayer();
  var hostPlayerEntityId = dataMap.getString("hostPlayerEntityId");
  var hostPlayer = null;
  if (hostPlayerEntityId !== "")
    hostPlayer = world.func_73045_a(hostPlayerEntityId);

  var offsetY = dataMap.getInt("offsetY");
  var railHeight = dataMap.getInt("railHeight");
  var railCant = dataMap.getInt("railCant");
  var railGuageName = dataMap.getString("railGuageName");
  var railGuage = null;
  if (!railGuageName) {
    railGuageName = defaultRailGuage;
    dataMap.setString("railGuageName", railGuageName, 0);
  }
  railGuage = railGuageList[railGuageName];
  var railPosAccuracy = dataMap.getDouble("railPosAccuracy");
  if (railPosAccuracy === 0) {
    railPosAccuracy = defaultRailPosAccuracy;
    dataMap.setDouble("railPosAccuracy", railPosAccuracy, 0);
  }

  doFollowing(entity, hostPlayer); //1.12用 プレイヤーについていく

  if (hostPlayer === player) {
    var lookingCursorPos = getLookingPos();
    var isKeyDown_Option = Keyboard.isKeyDown(KeyMaps.optionKey);
    var startMarker = startMarkerData.get(entity);
    var endMarker = endMarkerData.get(entity);
    var midPos = midPosData.get(entity);
    var switchMarkerList = switchMarkerData.get(entity);
    var splitRailList = splitRailData.get(entity);
    var transitionCurveData = transitionCurveBezierData.get(entity);
    var canSelectMidPos = dataMap.getBoolean("canSelectMidPos");
    var canSelectSwitchPos = dataMap.getBoolean("canSelectSwitchPos");
    var isBuilding = dataMap.getBoolean("isBuilding");
    var isHideHelp = dataMap.getBoolean("isHideHelp");
    var isSetUnderBlock = dataMap.getBoolean("isSetUnderBlock");
    var changeMarker = dataMap.getBoolean("changeMarker");
    var holdingRailItem = getPlayerRail(player);
    var hasRailMarker = false;
    //var hasRailMarker = hasPlayerMarker(player); 実装保留

    //オフセットY初期化
    var isInitialized = dataMap.getBoolean("isInitialized");
    if (!isInitialized) {
      dataMap.setBoolean("isInitialized", true, 0);
      dataMap.setInt("offsetY", 1, 0);
      offsetY = 1;
    }

    //##-------------------------##
    //##    バージョンチェック    ##
    //##-------------------------##
    var isVersionChecked = dataMap.getBoolean("isVersionChecked");
    var VERSIONS_server = dataMap.getString("VERSIONS");
    if (VERSIONS_server === "") VERSIONS_server = "Unknown";
    if (VERSIONS_server != SuperRailBuilderVersion && !isVersionChecked) {
      dataMap.setBoolean("isVersionChecked", true, 0);
      NGTLog.sendChatMessage(
        player,
        "[SuperRailBuilder3] Versions don't match!"
      );
      NGTLog.sendChatMessage(player, "Client:" + SuperRailBuilderVersion);
      NGTLog.sendChatMessage(player, "Server:" + VERSIONS_server);
    }

    //##---------------##
    //##    応答待ち    ##
    //##---------------##
    if (isBuilding) {
      if (dataMap.getBoolean("buildComplete")) {
        //生成完了
        dataMap.setBoolean("isBuilding", false, 1);
        dataMap.setBoolean("buildComplete", false, 1);
        dataMap.setString("buildData", "", 1);
        dataMap.setString("deleteRailData", "", 1);
        //リセット
        if (midPos !== null) {
          midPos = null;
          midPosData.put(entity, midPos);
        }
        if (canSelectMidPos) {
          canSelectMidPos = false;
          dataMap.setBoolean("canSelectMidPos", false, 0);
        }
        if (canSelectSwitchPos) {
          canSelectSwitchPos = false;
          dataMap.setBoolean("canSelectSwitchPos", false, 0);
        }
        if (endMarker !== null) {
          endMarker = null;
          endMarkerData.put(entity, null);
        }
        if (startMarker !== null) {
          startMarker = null;
          startMarkerData.put(entity, null);
        }
        if (switchMarkerList !== null) {
          switchMarkerList = null;
          switchMarkerData.put(entity, null);
        }
        if (splitRailList !== null) {
          splitRailList = null;
          splitRailData.put(entity, null);
        }
        //接続するレールを始点とする処理を書く
      }
    }

    //##---------------------##
    //##    プレイヤー操作    ##
    //##---------------------##
    if (!isOpenGUI && !isBuilding) {
      var prevInputOffsetKey = dataMap.getBoolean("prevInputOffsetKey");
      var isKeyDown_up = Keyboard.isKeyDown(KeyMaps.offsetYUp);
      var isKeyDown_down = Keyboard.isKeyDown(KeyMaps.offsetYDown);
      var isKeyDown_left = Keyboard.isKeyDown(KeyMaps.cantL);
      var isKeyDown_right = Keyboard.isKeyDown(KeyMaps.cantR);
      var isKeyDown_reset = Keyboard.isKeyDown(KeyMaps.resetOffsetY);
      var isKeyDown_delMarker = Keyboard.isKeyDown(KeyMaps.allDelete);
      var isLeftClick = Mouse.isButtonDown(0);
      var isRightClick = Mouse.isButtonDown(1);
      var prevIsClick = dataMap.getBoolean("prevIsClick");
      if (!prevIsClick && (isLeftClick || isRightClick))
        dataMap.setBoolean("prevIsClick", true, 0);
      if (prevIsClick && !isLeftClick && !isRightClick)
        dataMap.setBoolean("prevIsClick", false, 0);
      var lastKeyDownTime_LR = Number(dataMap.getString("continueKeyDown_LR")); //long型は収まらないのでString→Numberで持ち越し
      var currentTime = NGTUtil.getUniqueId();

      var isSelectedMarker = startMarker && endMarker && lookingCursorPos;

      //Yオフセット上げ
      if (!isKeyDown_Option && isKeyDown_up && !prevInputOffsetKey) {
        dataMap.setBoolean("prevInputOffsetKey", true, 0);
        offsetY += 1;
        dataMap.setInt("offsetY", offsetY, 0);
      }

      //Yオフセット下げ
      if (!isKeyDown_Option && isKeyDown_down && !prevInputOffsetKey) {
        dataMap.setBoolean("prevInputOffsetKey", true, 0);
        offsetY -= 1;
        dataMap.setInt("offsetY", offsetY, 0);
      }

      //レール高さ上げ
      if (
        isKeyDown_Option &&
        isKeyDown_up &&
        !prevInputOffsetKey &&
        !canSelectSwitchPos
      ) {
        dataMap.setBoolean("prevInputOffsetKey", true, 0);
        //マーカーの高さを直接変える
        if (isSelectedMarker) {
          var nearestMarker = getNearestMarker(
            startMarker,
            endMarker,
            lookingCursorPos.posX,
            lookingCursorPos.posY,
            lookingCursorPos.posZ
          );
          var currentRailHeight = nearestMarker.railHeight;
          if (currentRailHeight < 15) {
            currentRailHeight++;
            if (startMarker === nearestMarker) {
              startMarker = nearestMarker.copy(currentRailHeight);
              startMarker.setMarker(endMarker, midPos);
              startMarkerData.put(entity, startMarker);
            } else {
              endMarker = nearestMarker.copy(currentRailHeight);
              endMarker.setMarker(startMarker, midPos);
              endMarkerData.put(entity, endMarker);
            }
          }
        }
        //選択時の高さを変える
        else {
          railHeight += 1;
          if (railHeight > 15) {
            railHeight = 0;
            offsetY += 1;
            dataMap.setInt("offsetY", offsetY, 0);
          }
          dataMap.setInt("railHeight", railHeight, 0);
        }
      }

      //レール高さ下げ
      if (
        isKeyDown_Option &&
        isKeyDown_down &&
        !prevInputOffsetKey &&
        !canSelectSwitchPos
      ) {
        dataMap.setBoolean("prevInputOffsetKey", true, 0);
        //マーカーの高さを直接変える
        if (isSelectedMarker) {
          var nearestMarker = getNearestMarker(
            startMarker,
            endMarker,
            lookingCursorPos.posX,
            lookingCursorPos.posY,
            lookingCursorPos.posZ
          );
          var currentRailHeight = nearestMarker.railHeight;
          if (currentRailHeight > 0) {
            currentRailHeight--;
            if (startMarker === nearestMarker) {
              startMarker = nearestMarker.copy(currentRailHeight);
              startMarker.setMarker(endMarker, midPos);
              startMarkerData.put(entity, startMarker);
            } else {
              endMarker = nearestMarker.copy(currentRailHeight);
              endMarker.setMarker(startMarker, midPos);
              endMarkerData.put(entity, endMarker);
            }
          }
        }
        //選択時の高さを変える
        else {
          railHeight -= 1;
          if (railHeight < 0) {
            railHeight = 15;
            offsetY -= 1;
            dataMap.setInt("offsetY", offsetY, 0);
          }
          dataMap.setInt("railHeight", railHeight, 0);
        }
      }

      if (isKaizPatch || !isOldVer) {
        //RTM1.7.10はカント未実装
        //カント右
        if (
          !isKeyDown_Option &&
          isKeyDown_right &&
          (!prevInputOffsetKey ||
            currentTime - lastKeyDownTime_LR > continueKeyDownTime * 1000) &&
          !canSelectSwitchPos
        ) {
          if (!prevInputOffsetKey)
            dataMap.setString("continueKeyDown_LR", currentTime, 0);
          dataMap.setBoolean("prevInputOffsetKey", true, 0);
          //マーカーのカントを直接変える
          if (isSelectedMarker) {
            var nearestMarker = getNearestMarker(
              startMarker,
              endMarker,
              lookingCursorPos.posX,
              lookingCursorPos.posY,
              lookingCursorPos.posZ
            );
            if (nearestMarker.cantHeight < railGuage.maxCant) {
              nearestMarker.cantHeight += cantValue;
              if (nearestMarker.cantHeight % cantValue !== 0)
                nearestMarker.cantHeight -=
                  nearestMarker.cantHeight % cantValue;
              nearestMarker.cantAngle = NGTMath.toDegrees(
                Math.asin(
                  nearestMarker.cantHeight / nearestMarker.cantGuage.guage
                )
              );
              startMarker.syncCant(endMarker, null);
            }
          }
          //選択時のカントを変える
          else if (railCant < railGuage.maxCant) {
            railCant += cantValue;
            dataMap.setInt("railCant", railCant, 0);
          }
        }

        //カント左
        if (
          !isKeyDown_Option &&
          isKeyDown_left &&
          (!prevInputOffsetKey ||
            currentTime - lastKeyDownTime_LR > continueKeyDownTime * 1000) &&
          !canSelectSwitchPos
        ) {
          if (!prevInputOffsetKey)
            dataMap.setString("continueKeyDown_LR", currentTime, 0);
          dataMap.setBoolean("prevInputOffsetKey", true, 0);
          //マーカーのカントを直接変える
          if (isSelectedMarker) {
            var nearestMarker = getNearestMarker(
              startMarker,
              endMarker,
              lookingCursorPos.posX,
              lookingCursorPos.posY,
              lookingCursorPos.posZ
            );
            if (nearestMarker.cantHeight > 0) {
              nearestMarker.cantHeight -= cantValue;
              if (nearestMarker.cantHeight % cantValue !== 0)
                nearestMarker.cantHeight +=
                  -(nearestMarker.cantHeight % cantValue) + cantValue;
              nearestMarker.cantAngle = NGTMath.toDegrees(
                Math.asin(
                  nearestMarker.cantHeight / nearestMarker.cantGuage.guage
                )
              );
              startMarker.syncCant(endMarker, null);
            }
          }
          //選択時のカントを変える
          else if (railCant > 0) {
            railCant -= cantValue;
            dataMap.setInt("railCant", railCant, 0);
          }
        }

        //ゲージ設定-後
        if (isKeyDown_Option && isKeyDown_right && !prevInputOffsetKey) {
          dataMap.setBoolean("prevInputOffsetKey", true, 0);
          var keys = Object.keys(railGuageList);
          var currentIndex = keys.indexOf(railGuageName);
          var nextIndex = (currentIndex + 1) % keys.length;
          railGuageName = keys[nextIndex];
          railGuage = railGuageList[railGuageName];
          dataMap.setString("railGuageName", railGuageName, 0);
          NGTLog.sendChatMessage(
            player,
            "Rail guage: " +
              railGuage.name +
              " / Max cant: " +
              railGuage.maxCant
          );
          if (Math.abs(railCant) > railGuage.maxCant) {
            railCant = railCant < 0 ? 0 : railGuage.maxCant;
            dataMap.setInt("railCant", railCant, 0);
          }
        }

        //ゲージ設定-前
        if (isKeyDown_Option && isKeyDown_left && !prevInputOffsetKey) {
          dataMap.setBoolean("prevInputOffsetKey", true, 0);
          var keys = Object.keys(railGuageList);
          var currentIndex = keys.indexOf(railGuageName);
          var nextIndex = currentIndex - 1;
          if (nextIndex < 0) nextIndex = keys.length - 1;
          railGuageName = keys[nextIndex];
          railGuage = railGuageList[railGuageName];
          dataMap.setString("railGuageName", railGuageName, 0);
          NGTLog.sendChatMessage(
            player,
            "Rail guage: " +
              railGuage.name +
              " / Max cant: " +
              railGuage.maxCant
          );
          if (Math.abs(railCant) > railGuage.maxCant) {
            railCant = railCant < 0 ? 0 : railGuage.maxCant;
            dataMap.setInt("railCant", railCant, 0);
          }
        }
      }

      //Yオフセットリセット
      if (!isKeyDown_Option && isKeyDown_reset) {
        dataMap.setInt("offsetY", 1, 0);
        dataMap.setInt("railHeight", 0, 0);
      }

      //changeMarker ON/OFF
      if (
        canSelectSwitchPos &&
        switchMarkerList &&
        switchMarkerList.length === 3
      ) {
        var isKeyDown_changeMarker = Keyboard.isKeyDown(KeyMaps.changeMarker);
        var prevInputKey_changeMarker = dataMap.getBoolean(
          "prevInputKey_changeMarker"
        );
        if (isKeyDown_changeMarker && !prevInputKey_changeMarker) {
          dataMap.setBoolean("prevInputKey_changeMarker", true, 0);
          changeMarker = !changeMarker;
          dataMap.setBoolean("changeMarker", changeMarker, 1);
          NGTLog.sendChatMessage(player, "Target marker changed");
        }
        if (!isKeyDown_changeMarker && prevInputKey_changeMarker) {
          dataMap.setBoolean("prevInputKey_changeMarker", false, 0);
        }
      }

      //緩和曲線を作成
      if (startMarker && endMarker && !midPos) {
        var isKeyDown_changeMarker = Keyboard.isKeyDown(KeyMaps.changeMarker);
        var prevInputKey_changeMarker = dataMap.getBoolean(
          "prevInputKey_changeMarker"
        );
        if (isKeyDown_changeMarker && !prevInputKey_changeMarker) {
          dataMap.setBoolean("prevInputKey_changeMarker", true, 0);
          var transitionCurveData = createTransitionCurveBezier(
            startMarker,
            endMarker,
            world
          );
          if (transitionCurveData) {
            NGTLog.sendChatMessage(player, "Generate transition curve");
            NGTLog.sendChatMessage(
              player,
              "Target radius : " +
                Math.floor(Math.abs(transitionCurveData.radius) * 10) / 10 +
                "m"
            );
            //NGTLog.sendChatMessage(player, "Curve length : " + (Math.floor(transitionCurveData.length * 10) / 10) + "m");

            //描画プレビュー
            transitionCurveBezierData.put(entity, transitionCurveData);
          }
        }
        if (!isKeyDown_changeMarker && prevInputKey_changeMarker) {
          dataMap.setBoolean("prevInputKey_changeMarker", false, 0);
        }
      }

      //isSetUnderBlock
      var isKeyDown_isSetUnderBlock = Keyboard.isKeyDown(
        KeyMaps.isSetUnderBlock
      );
      var prevInputKey_isSetUnderBlock = dataMap.getBoolean(
        "prevInputKey_isSetUnderBlock"
      );
      if (isKeyDown_isSetUnderBlock && !prevInputKey_isSetUnderBlock) {
        dataMap.setBoolean("prevInputKey_isSetUnderBlock", true, 0);
        isSetUnderBlock = !isSetUnderBlock;
        dataMap.setBoolean("isSetUnderBlock", isSetUnderBlock, 1);
        NGTLog.sendChatMessage(
          player,
          "Place a block under the rail : " + isSetUnderBlock
        );
      }
      if (!isKeyDown_isSetUnderBlock && prevInputKey_isSetUnderBlock) {
        dataMap.setBoolean("prevInputKey_isSetUnderBlock", false, 0);
      }

      //ヘルプ非表示
      var isKeyDown_isHideHelp = Keyboard.isKeyDown(KeyMaps.isHideHelp);
      var prevInputKey_isHideHelp = dataMap.getBoolean(
        "prevInputKey_isHideHelp"
      );
      if (isKeyDown_isHideHelp && !prevInputKey_isHideHelp) {
        dataMap.setBoolean("prevInputKey_isHideHelp", true, 0);
        isHideHelp = !isHideHelp;
        dataMap.setBoolean("isHideHelp", isHideHelp, 1);
      }
      if (!isKeyDown_isHideHelp && prevInputKey_isHideHelp) {
        dataMap.setBoolean("prevInputKey_isHideHelp", false, 0);
      }

      //マーカーリセット
      if (isKeyDown_delMarker) {
        if (midPos !== null) {
          midPos = null;
          midPosData.put(entity, midPos);
        }
        if (canSelectMidPos) {
          canSelectMidPos = false;
          dataMap.setBoolean("canSelectMidPos", false, 0);
        }
        if (canSelectSwitchPos) {
          canSelectSwitchPos = false;
          dataMap.setBoolean("canSelectSwitchPos", false, 0);
        }
        if (endMarker !== null) {
          endMarker = null;
          endMarkerData.put(entity, null);
        }
        if (startMarker !== null) {
          startMarker = null;
          startMarkerData.put(entity, null);
        }
        if (switchMarkerList !== null) {
          switchMarkerList = null;
          switchMarkerData.put(entity, null);
        }
        if (splitRailList !== null) {
          splitRailList = null;
          splitRailData.put(entity, null);
        }
        offsetY = 1;
        dataMap.setInt("offsetY", offsetY, 0);
        railHeight = 0;
        dataMap.setInt("railHeight", railHeight, 1);
        if (transitionCurveData) transitionCurveBezierData.put(entity, null);
        if (isKeyDown_Option) {
          railCant = 0;
          dataMap.setInt("railCant", railCant, 0);
          railGuageName = defaultRailGuage;
        }
      }

      //高さスナップ
      if (
        isKeyDown_Option &&
        isKeyDown_reset &&
        lookingCursorPos &&
        startMarker
      ) {
        var markerY = startMarker.blockY;
        var currentBlockY = lookingCursorPos.blockY;
        offsetY = markerY - currentBlockY;
        dataMap.setInt("offsetY", offsetY, 0);
        railHeight = startMarker.railHeight;
        dataMap.setInt("railHeight", railHeight, 0);
      }

      if (
        !isKeyDown_up &&
        !isKeyDown_down &&
        !isKeyDown_left &&
        !isKeyDown_right &&
        prevInputOffsetKey
      ) {
        dataMap.setBoolean("prevInputOffsetKey", false, 0);
      }

      //精度変更
      var prevInputKey_changeAccuracy = dataMap.getBoolean(
        "prevInputKey_changeAccuracy"
      );
      var isKeyDown_changeAccuracy = Keyboard.isKeyDown(
        KeyMaps.changePointAccuracy
      );
      if (isKeyDown_changeAccuracy !== prevInputKey_changeAccuracy)
        dataMap.setBoolean(
          "prevInputKey_changeAccuracy",
          isKeyDown_changeAccuracy,
          0
        );
      if (!prevInputKey_changeAccuracy && isKeyDown_changeAccuracy) {
        var currentIndex = railPosAccuracyList.indexOf(railPosAccuracy);
        var newIndex = (currentIndex + 1) % railPosAccuracyList.length;
        railPosAccuracy = railPosAccuracyList[newIndex];
        dataMap.setDouble("railPosAccuracy", railPosAccuracy, 0);
        NGTLog.sendChatMessage(
          player,
          "Rail pos accuracy : " + railPosAccuracy
        );
      }

      //終了
      if (Keyboard.isKeyDown(KeyMaps.endEdit)) {
        dataMap.setBoolean("isEndEdit", true, 1);
      }

      //座標指定
      if (lookingCursorPos && !prevIsClick) {
        //右クリック ポイント追加
        if (isRightClick) {
          var addMarker = function (
            selectType,
            x,
            y,
            z,
            dir,
            railHeight,
            cantHeight,
            fixedYaw,
            fixedPitch,
            fixedVec
          ) {
            var newMarker = null;
            if (startMarker === null) {
              startMarker = new Marker(
                selectType,
                x,
                y,
                z,
                dir,
                railHeight,
                cantHeight,
                railGuage,
                fixedYaw,
                fixedPitch,
                fixedVec
              );
              startMarkerData.put(entity, startMarker);
              newMarker = startMarker;
            } else if (endMarker === null) {
              endMarker = new Marker(
                selectType,
                x,
                y,
                z,
                dir,
                railHeight,
                cantHeight,
                railGuage,
                fixedYaw,
                fixedPitch,
                fixedVec
              );
              startMarker.setMarker(endMarker, null);
              startMarkerData.put(entity, startMarker);
              endMarkerData.put(entity, endMarker);
              newMarker = endMarker;
            }
            return newMarker;
          };
          //分岐選択有効化
          if (!canSelectSwitchPos) {
            if (startMarker && endMarker) {
              var checker = new CheckType(startMarker, endMarker);
              if (checker.include(SelectType.fixed)) {
                if (
                  startMarker.blockY === endMarker.blockY &&
                  startMarker.railHeight === endMarker.railHeight
                ) {
                  dataMap.setBoolean("canSelectSwitchPos", true, 0);
                } else {
                  NGTLog.sendChatMessage(
                    player,
                    "[SuperRailBuilder3] Unable to create branch rail"
                  );
                  if (startMarker.blockY !== endMarker.blockY) {
                    NGTLog.sendChatMessage(
                      player,
                      "BlockY mismatch : start BlockY(" +
                        startMarker.blockY +
                        ") / end BlockY(" +
                        endMarker.blockY +
                        ")"
                    );
                  }
                  if (startMarker.railHeight !== endMarker.railHeight) {
                    NGTLog.sendChatMessage(
                      player,
                      "RailHeight mismatch : start RailHeight(" +
                        startMarker.railHeight +
                        ") / end RailHeight(" +
                        endMarker.railHeight +
                        ")"
                    );
                  }
                }
              }
            } else if (switchMarkerList && switchMarkerList.length < 4) {
              dataMap.setBoolean("canSelectSwitchPos", true, 0);
            }
          }
          //中間地点有効化
          if (startMarker && endMarker && !canSelectMidPos) {
            var checker = new CheckType(startMarker, endMarker);
            if (
              checker.include(SelectType.block) ||
              checker.include(SelectType.pos)
            ) {
              dataMap.setBoolean("canSelectMidPos", true, 0);
            }
          }
          var aroundRailData = getAroundRailData(
            world,
            lookingCursorPos.blockX,
            lookingCursorPos.blockY + offsetY,
            lookingCursorPos.blockZ
          );
          var onTileEntity = getTileEntity(
            world,
            lookingCursorPos.blockX,
            lookingCursorPos.blockY + offsetY,
            lookingCursorPos.blockZ
          );
          if (!onTileEntity)
            onTileEntity = getTileEntity(
              world,
              lookingCursorPos.blockX,
              lookingCursorPos.blockY + offsetY - 1,
              lookingCursorPos.blockZ
            );
          var isPointingRail = onTileEntity instanceof TileEntityLargeRailBase;
          var isUnavailableSelect = false;
          //同じ座標は指定不可
          if (
            startMarker &&
            startMarker.blockX === lookingCursorPos.blockX &&
            startMarker.blockZ === lookingCursorPos.blockZ
          )
            isUnavailableSelect = true;
          if (startMarker && aroundRailData && aroundRailData.isRPSnap) {
            var connectBlockPos = getConnectPos(aroundRailData.rp);
            if (
              startMarker.blockX === connectBlockPos.x &&
              startMarker.blockZ === connectBlockPos.z
            )
              isUnavailableSelect = true;
          }
          if (switchMarkerList) isUnavailableSelect = true;
          if (splitRailList) isUnavailableSelect = true;

          //通常モード
          if (
            !canSelectMidPos &&
            !isKeyDown_Option &&
            !aroundRailData &&
            !isUnavailableSelect
          ) {
            addMarker(
              SelectType.block,
              lookingCursorPos.blockX,
              lookingCursorPos.blockY + offsetY,
              lookingCursorPos.blockZ,
              null,
              railHeight,
              railCant,
              null,
              null
            );
          }

          //レール接続モード
          if (
            !canSelectMidPos &&
            !isKeyDown_Option &&
            aroundRailData &&
            aroundRailData.isRPSnap &&
            !isUnavailableSelect
          ) {
            var connectBlockPos = getConnectPos(aroundRailData.rp);
            var connectRailMap = getNearestRPAndRM(
              world,
              aroundRailData.tile,
              connectBlockPos.x,
              connectBlockPos.y,
              connectBlockPos.z
            ).railMap;
            var cantHeight =
              isKaizPatch || !isOldVer
                ? railGuage.guage *
                  NGTMath.sin(Math.abs(aroundRailData.rp.cantEdge))
                : 0;
            var anchorYaw =
              isKaizPatch || !isOldVer
                ? aroundRailData.rp.anchorYaw
                : aroundRailData.rp.anchorDirection;
            var anchorPitch =
              isKaizPatch || !isOldVer
                ? aroundRailData.rp.anchorPitch
                : connectRailMap.getRailPitch();
            if (
              anchorPitch === 0 &&
              (isKaizPatch || !isOldVer) &&
              connectRailMap
            ) {
              //縦曲線未設定による代替処理
              var railMap = connectRailMap;
              var split = Math.floor(railMap.getLength() * 2);
              anchorPitch = railMap.getRailPitch(split, 0);
            }
            addMarker(
              SelectType.connectRail,
              connectBlockPos.x,
              connectBlockPos.y,
              connectBlockPos.z,
              (aroundRailData.rp.direction + 4) % 8,
              aroundRailData.rp.height,
              cantHeight,
              normalizeYaw(anchorYaw + 180),
              -anchorPitch
            );
          }

          //レール再構築モード・レール選択
          if (
            !startMarker &&
            !isKeyDown_Option &&
            aroundRailData &&
            !aroundRailData.isRPSnap &&
            !isUnavailableSelect
          ) {
            if (isSwitchRail(aroundRailData.tile)) {
              switchMarkerList = [];
              var core = aroundRailData.tile.getRailCore();
              if (core && core.getSwitch() && core.getSwitch().getPoints()) {
                var points = core.getSwitch().getPoints();
                for (var i = 0; i < points.length; i++) {
                  var rp = points[i].rpRoot;
                  var rpAnchorYaw =
                    isKaizPatch || !isOldVer
                      ? rp.anchorYaw
                      : rp.anchorDirection;
                  var rsAnchorLength =
                    isKaizPatch || !isOldVer
                      ? rp.anchorLengthHorizontal
                      : rp.anchorLength;
                  var rpAnchorVec = new Vec3(
                    0,
                    0,
                    rsAnchorLength
                  ).rotateAroundY(rpAnchorYaw);
                  var marker = null;
                  if (rp.switchType === SwitchType.switch) {
                    marker = new Marker(
                      SelectType.switch,
                      rp.blockX,
                      rp.blockY,
                      rp.blockZ,
                      rp.direction,
                      rp.height,
                      0,
                      railGuage,
                      null,
                      null,
                      rpAnchorVec
                    );
                  } else {
                    marker = new Marker(
                      SelectType.fixed,
                      rp.blockX,
                      rp.blockY,
                      rp.blockZ,
                      rp.direction,
                      rp.height,
                      0,
                      railGuage,
                      null,
                      null,
                      rpAnchorVec
                    );
                  }
                  switchMarkerList.push(marker);
                }
              }
              switchMarkerData.put(entity, switchMarkerList);
            } else {
              var rps = aroundRailData.tile.getRailCore().getRailPositions();
              var startRP = rps[0];
              var endRP = rps[1];
              var straightPitch = new Vec3(
                endRP.posX - startRP.posX,
                endRP.posY - startRP.posY,
                endRP.posZ - startRP.posZ
              ).getPitch();
              //ピッチ
              var startAnchorPitch =
                isKaizPatch || !isOldVer ? startRP.anchorPitch : straightPitch;
              var endAnchorPitch =
                isKaizPatch || !isOldVer ? endRP.anchorPitch : straightPitch;
              if (
                startAnchorPitch === 0 &&
                endAnchorPitch === 0 &&
                startRP.posY !== endRP.posY &&
                (isKaizPatch || !isOldVer) &&
                aroundRailData.tile.getRailMap(null)
              ) {
                //縦曲線未設定による代替処理
                var railMap = aroundRailData.tile.getRailMap(null);
                var split = Math.floor(railMap.getLength() * 2);
                startAnchorPitch = railMap.getRailPitch(split, 0);
                endAnchorPitch = -startAnchorPitch;
              }
              //始点
              var startCantHeight =
                isKaizPatch || !isOldVer
                  ? railGuage.guage * NGTMath.sin(Math.abs(startRP.cantEdge))
                  : 0;
              var startAnchorYaw =
                isKaizPatch || !isOldVer
                  ? startRP.anchorYaw
                  : startRP.anchorDirection;
              var startAnchorLength =
                isKaizPatch || !isOldVer
                  ? startRP.anchorLengthHorizontal
                  : startRP.anchorLength;
              var startAnchorVec = new Vec3(0, 0, startAnchorLength)
                .rotateAroundX(startAnchorPitch)
                .rotateAroundY(startAnchorYaw);
              //終点
              var endCantHeight =
                isKaizPatch || !isOldVer
                  ? railGuage.guage * NGTMath.sin(Math.abs(endRP.cantEdge))
                  : 0;
              var endAnchorYaw =
                isKaizPatch || !isOldVer
                  ? endRP.anchorYaw
                  : endRP.anchorDirection;
              var endAnchorLength =
                isKaizPatch || !isOldVer
                  ? endRP.anchorLengthHorizontal
                  : endRP.anchorLength;
              var endAnchorVec = new Vec3(0, 0, endAnchorLength)
                .rotateAroundX(endAnchorPitch)
                .rotateAroundY(endAnchorYaw);
              //始点マーカー
              startMarker = addMarker(
                SelectType.fixed,
                startRP.blockX,
                startRP.blockY,
                startRP.blockZ,
                startRP.direction,
                startRP.height,
                startCantHeight,
                null,
                null,
                startAnchorVec
              );
              //終点マーカー
              endMarker = addMarker(
                SelectType.fixed,
                endRP.blockX,
                endRP.blockY,
                endRP.blockZ,
                endRP.direction,
                endRP.height,
                endCantHeight,
                null,
                null,
                endAnchorVec
              );
              startMarker.syncCant(endMarker, null);
            }
          }

          //分岐作成モード
          if (
            canSelectSwitchPos &&
            startMarker &&
            endMarker &&
            (!switchMarkerList ||
              (switchMarkerList && switchMarkerList.length === 2))
          ) {
            //遠い方を分岐始点に変換
            var nearestMarker = getNearestMarker(
              startMarker,
              endMarker,
              lookingCursorPos.posX,
              lookingCursorPos.posY,
              lookingCursorPos.posZ
            );
            var otherMarker =
              nearestMarker === startMarker ? endMarker : startMarker;
            switchMarkerList = [otherMarker, nearestMarker];
          }
          if (
            canSelectSwitchPos &&
            switchMarkerList &&
            ((!startMarker && switchMarkerList.length === 3) ||
              (startMarker && switchMarkerList.length === 2))
          ) {
            var newMarker = null;
            var rootY = switchMarkerList[0].blockY;
            var rootHeight = switchMarkerList[0].railHeight;
            var railTile = getTileEntity(
              world,
              lookingCursorPos.blockX,
              lookingCursorPos.blockY,
              lookingCursorPos.blockZ
            );
            if (!(railTile instanceof TileEntityLargeRailBase)) railTile = null;
            //普通選択
            if (!isKeyDown_Option && !railTile) {
              newMarker = new Marker(
                SelectType.block,
                lookingCursorPos.blockX,
                rootY,
                lookingCursorPos.blockZ,
                null,
                rootHeight,
                0,
                railGuage,
                null,
                null
              );
            }
            //向き固定選択
            else if (isKeyDown_Option && !railTile) {
              var dirIndex = MarkerDirection.getDirFromPos(
                lookingCursorPos.blockX,
                lookingCursorPos.blockZ,
                lookingCursorPos.snapX,
                lookingCursorPos.snapZ
              );
              newMarker = new Marker(
                SelectType.pos,
                lookingCursorPos.blockX,
                rootY,
                lookingCursorPos.blockZ,
                dirIndex,
                rootHeight,
                0,
                railGuage,
                null,
                null
              );
            }
            //レール接続
            else if (railTile) {
              var nearestData = getNearestRPAndRM(
                world,
                railTile,
                lookingCursorPos.blockX,
                lookingCursorPos.blockY,
                lookingCursorPos.blockZ
              );
              var isSelfConnect = false;
              for (var i = 0; i < switchMarkerList.length; i++) {
                if (isSelfConnect) continue;
                var markerX = switchMarkerList[i].blockX;
                var markerY = switchMarkerList[i].blockY;
                var markerZ = switchMarkerList[i].blockZ;
                var rpX = nearestData.railPosition.blockX;
                var rpY = nearestData.railPosition.blockY;
                var rpZ = nearestData.railPosition.blockZ;
                if (markerX === rpX && markerY === rpY && markerZ === rpZ)
                  isSelfConnect = true;
              }
              if (!isSelfConnect) {
                var connectBlockPos = getConnectPos(nearestData.railPosition);
                var connectRailMap = nearestData.railMap;
                var anchorYaw =
                  isKaizPatch || !isOldVer
                    ? nearestData.railPosition.anchorYaw
                    : nearestData.railPosition.anchorDirection;
                newMarker = new Marker(
                  SelectType.connectRail,
                  connectBlockPos.x,
                  rootY,
                  connectBlockPos.z,
                  (nearestData.railPosition.direction + 4) % 8,
                  rootHeight,
                  0,
                  railGuage,
                  normalizeYaw(anchorYaw + 180),
                  0
                );
              }
            }
            if (newMarker) {
              //マーカー正規化
              if (switchMarkerList.length === 2) {
                //片渡り分岐(push前なので2)
                switchMarkerList[0].setMarker(newMarker, null);
                newMarker.selectType = SelectType.fixed;
                newMarker.switchType = SwitchType.normal;
                switchMarkerList[0].selectType = SelectType.switch;
                switchMarkerList[0].switchType = SwitchType.switch;
                switchMarkerList[0].resetCant();
                switchMarkerList[1].resetCant();
              } else if (switchMarkerList.length === 3) {
                //両渡り分岐(push前なので3)
                var marker0 = switchMarkerList[0];
                var marker1 = switchMarkerList[1];
                var marker2 = switchMarkerList[2];
                marker0.selectType = SelectType.switch;
                marker0.switchType = SwitchType.switch;
                marker1.selectType = SelectType.switch;
                marker1.switchType = SwitchType.switch;
                marker2.selectType = SelectType.switch;
                marker2.switchType = SwitchType.switch;
                marker0.resetCant();
                marker1.resetCant();
                marker2.resetCant();
                var nearestMarker = changeMarker ? marker1 : marker2;
                nearestMarker.setMarker(newMarker, null);
                newMarker.selectType = SelectType.switch;
                newMarker.switchType = SwitchType.switch;
              }
              //追加
              if (startMarker) switchMarkerList[2] = newMarker;
              else switchMarkerList[3] = newMarker;
              switchMarkerData.put(entity, switchMarkerList);
            }
          }

          //レール分割モード
          if (
            !startMarker &&
            isKeyDown_Option &&
            aroundRailData &&
            !aroundRailData.isRPSnap &&
            !isUnavailableSelect &&
            !splitRailList &&
            !isSwitchRail(aroundRailData.tile)
          ) {
            var railMaps = getAllRailMapsFromTile(aroundRailData.tile);
            var railMap = railMaps.length !== 0 ? railMaps[0] : null;
            var startRP = railMap ? railMap.getStartRP() : null;
            var endRP = railMap ? railMap.getEndRP() : null;
            var snapPosList = getSplitPosList(railMap, railPosAccuracy);
            var splitPos = getNearestPosFromList(
              snapPosList,
              lookingCursorPos.posX,
              lookingCursorPos.posY,
              lookingCursorPos.posZ,
              railSnapDistance
            );
            if (splitPos) {
              splitPos[0] = Math.round(splitPos[0] * 2) / 2;
              splitPos[2] = Math.round(splitPos[2] * 2) / 2;
              //--始点終点のデータを作る--
              var straightPitch = new Vec3(
                endRP.posX - startRP.posX,
                endRP.posY - startRP.posY,
                endRP.posZ - startRP.posZ
              ).getPitch();
              //ピッチ
              var startAnchorPitch =
                isKaizPatch || !isOldVer ? startRP.anchorPitch : straightPitch;
              var endAnchorPitch =
                isKaizPatch || !isOldVer ? endRP.anchorPitch : straightPitch;
              if (
                startAnchorPitch === 0 &&
                endAnchorPitch === 0 &&
                startRP.posY !== endRP.posY &&
                (isKaizPatch || !isOldVer) &&
                aroundRailData.tile.getRailMap(null)
              ) {
                //縦曲線未設定による代替処理
                var railMap = aroundRailData.tile.getRailMap(null);
                var split = Math.floor(railMap.getLength() * 2);
                startAnchorPitch = railMap.getRailPitch(split, 0);
                endAnchorPitch = -startAnchorPitch;
              }
              //始点
              var startCantHeight =
                isKaizPatch || !isOldVer
                  ? railGuage.guage * NGTMath.sin(Math.abs(startRP.cantEdge))
                  : 0;
              var startAnchorYaw =
                isKaizPatch || !isOldVer
                  ? startRP.anchorYaw
                  : startRP.anchorDirection;
              var startAnchorLength =
                isKaizPatch || !isOldVer
                  ? startRP.anchorLengthHorizontal
                  : startRP.anchorLength;
              var startAnchorVec = new Vec3(0, 0, startAnchorLength)
                .rotateAroundX(startAnchorPitch)
                .rotateAroundY(startAnchorYaw);
              //終点
              var endCantHeight =
                isKaizPatch || !isOldVer
                  ? railGuage.guage * NGTMath.sin(Math.abs(endRP.cantEdge))
                  : 0;
              var endAnchorYaw =
                isKaizPatch || !isOldVer
                  ? endRP.anchorYaw
                  : endRP.anchorDirection;
              var endAnchorLength =
                isKaizPatch || !isOldVer
                  ? endRP.anchorLengthHorizontal
                  : endRP.anchorLength;
              var endAnchorVec = new Vec3(0, 0, endAnchorLength)
                .rotateAroundX(endAnchorPitch)
                .rotateAroundY(endAnchorYaw);
              //--分割地点のデータを作る--
              var splitYaw = splitPos[3];
              var splitPitch = splitPos[4];
              var splitRate1 = splitPos[5];
              var splitRate2 = 1 - splitRate1;
              var splitCantHeight =
                startCantHeight * splitRate2 + endCantHeight * splitRate1;
              var splitRailHeight =
                Math.round((splitPos[1] - 0.0625) * 16) % 16;
              var splitAnchorVec1 = new Vec3(0, 0, 0.25)
                .rotateAroundX(splitPitch)
                .rotateAroundY(normalizeYaw(splitYaw));
              var splitAnchorVec2 = new Vec3(0, 0, 0.25)
                .rotateAroundX(-splitPitch)
                .rotateAroundY(normalizeYaw(splitYaw + 180));
              var splitAnchorPos1 = [
                Math.floor(splitAnchorVec1.getX() + splitPos[0]),
                Math.floor(splitPos[1]),
                Math.floor(splitAnchorVec1.getZ() + splitPos[2])
              ];
              var splitAnchorPos2 = [
                Math.floor(splitAnchorVec2.getX() + splitPos[0]),
                Math.floor(splitPos[1]),
                Math.floor(splitAnchorVec2.getZ() + splitPos[2])
              ];
              splitAnchorVec1 = splitAnchorVec1.multi(4);
              splitAnchorVec2 = splitAnchorVec2.multi(4);
              var splitDir1 = MarkerDirection.getDirFromSnapPos(
                splitPos[0],
                splitPos[2],
                normalizeYaw(splitYaw)
              );
              var splitDir2 = MarkerDirection.getDirFromSnapPos(
                splitPos[0],
                splitPos[2],
                normalizeYaw(splitYaw + 180)
              );
              //--マーカーを構築--
              var splitStartMarker = new Marker(
                SelectType.fixed,
                startRP.blockX,
                startRP.blockY,
                startRP.blockZ,
                startRP.direction,
                startRP.height,
                startCantHeight,
                railGuage,
                null,
                null,
                startAnchorVec
              );
              var splitEndMarker = new Marker(
                SelectType.fixed,
                endRP.blockX,
                endRP.blockY,
                endRP.blockZ,
                endRP.direction,
                endRP.height,
                endCantHeight,
                railGuage,
                null,
                null,
                endAnchorVec
              );
              var splitMarker1 = new Marker(
                SelectType.fixed,
                splitAnchorPos1[0],
                splitAnchorPos1[1],
                splitAnchorPos1[2],
                splitDir1,
                splitRailHeight,
                splitCantHeight,
                railGuage,
                null,
                null,
                splitAnchorVec1
              );
              var splitMarker2 = new Marker(
                SelectType.fixed,
                splitAnchorPos2[0],
                splitAnchorPos2[1],
                splitAnchorPos2[2],
                splitDir2,
                splitRailHeight,
                splitCantHeight,
                railGuage,
                null,
                null,
                splitAnchorVec2
              );
              //--距離の比較--
              var distanceSq1 = getDistanceSq(
                splitStartMarker.blockX,
                splitStartMarker.blockY,
                splitStartMarker.blockZ,
                splitMarker1.blockX,
                splitMarker1.blockY,
                splitMarker1.blockZ
              );
              var distanceSq2 = getDistanceSq(
                splitStartMarker.blockX,
                splitStartMarker.blockY,
                splitStartMarker.blockZ,
                splitMarker2.blockX,
                splitMarker2.blockY,
                splitMarker2.blockZ
              );
              //--アンカーを補正する--
              if (distanceSq1 < distanceSq2) {
                //start to 1
                splitStartMarker.anchorVec =
                  splitStartMarker.anchorVec.multi(splitRate1);
                splitMarker1.anchorVec = splitMarker1.anchorVec.multi(
                  endAnchorLength * splitRate1
                );
                splitStartMarker.syncCant(splitMarker1, null);
                //end to 2
                splitEndMarker.anchorVec =
                  splitEndMarker.anchorVec.multi(splitRate2);
                splitMarker2.anchorVec = splitMarker2.anchorVec.multi(
                  startAnchorLength * splitRate2
                );
                splitMarker2.syncCant(splitEndMarker, null);
                //set
                splitRailList = [
                  splitStartMarker,
                  splitMarker1,
                  splitMarker2,
                  splitEndMarker
                ];
                splitRailData.put(entity, splitRailList);
              } else {
                //start to 2
                splitStartMarker.anchorVec =
                  splitStartMarker.anchorVec.multi(splitRate1);
                splitMarker2.anchorVec = splitMarker2.anchorVec.multi(
                  endAnchorLength * splitRate1
                );
                splitStartMarker.syncCant(splitMarker2, null);
                //end to 1
                splitEndMarker.anchorVec =
                  splitEndMarker.anchorVec.multi(splitRate2);
                splitMarker1.anchorVec = splitMarker1.anchorVec.multi(
                  startAnchorLength * splitRate2
                );
                splitMarker1.syncCant(splitEndMarker, null);
                //set
                splitRailList = [
                  splitStartMarker,
                  splitMarker2,
                  splitMarker1,
                  splitEndMarker
                ];
                splitRailData.put(entity, splitRailList);
              }
            }
          }

          //向き固定モード
          if (
            !canSelectMidPos &&
            isKeyDown_Option &&
            !isPointingRail &&
            !isUnavailableSelect
          ) {
            var dirIndex = MarkerDirection.getDirFromPos(
              lookingCursorPos.blockX,
              lookingCursorPos.blockZ,
              lookingCursorPos.snapX,
              lookingCursorPos.snapZ
            );
            addMarker(
              SelectType.pos,
              lookingCursorPos.blockX,
              lookingCursorPos.blockY + offsetY,
              lookingCursorPos.blockZ,
              dirIndex,
              railHeight,
              railCant,
              null,
              null
            );
          }

          //中点設置-スナップ設置
          var checker = new CheckType(startMarker, endMarker);
          if (
            canSelectMidPos &&
            !isKeyDown_Option &&
            !(
              checker.include(SelectType.connectRail) ||
              checker.include(SelectType.switch)
            )
          ) {
            midPos = getMidPosAtCircle(
              startMarker.posX,
              startMarker.posY,
              startMarker.posZ,
              endMarker.posX,
              endMarker.posY,
              endMarker.posZ,
              lookingCursorPos.posX,
              lookingCursorPos.posY,
              lookingCursorPos.posZ
            );
            startMarker.setMarker(endMarker, midPos);
            midPosData.put(entity, midPos);
            startMarkerData.put(entity, startMarker);
            endMarkerData.put(entity, endMarker);
          }

          //中点設置-自由設置
          if (
            canSelectMidPos &&
            (isKeyDown_Option ||
              checker.include(SelectType.connectRail) ||
              checker.include(SelectType.switch))
          ) {
            midPos = {
              x: lookingCursorPos.posX,
              y: lookingCursorPos.blockY + offsetY,
              z: lookingCursorPos.posZ,
              isSnap: false
            };
            startMarker.setMarker(endMarker, midPos);
            midPosData.put(entity, midPos);
            startMarkerData.put(entity, startMarker);
            endMarkerData.put(entity, endMarker);
          }
        }
        //左クリック ポイント削除
        if (isLeftClick) {
          //分岐追加点削除
          if (
            canSelectSwitchPos &&
            switchMarkerList &&
            ((startMarker && endMarker && switchMarkerList.length === 3) ||
              switchMarkerList.length === 4)
          ) {
            switchMarkerList.pop();
            switchMarkerData.put(entity, switchMarkerList);
          }
          //分岐作成モードOFF(分岐レール)
          else if (
            canSelectSwitchPos &&
            !startMarker &&
            !endMarker &&
            switchMarkerList &&
            switchMarkerList.length === 3
          ) {
            canSelectSwitchPos = false;
            dataMap.setBoolean("canSelectSwitchPos", false, 0);
          }
          //分岐作成モードOFF(普通レール)
          else if (canSelectSwitchPos && startMarker && endMarker) {
            canSelectSwitchPos = false;
            dataMap.setBoolean("canSelectSwitchPos", false, 0);
            switchMarkerList = null;
            switchMarkerData.put(entity, null);
            startMarker.selectType = SelectType.fixed;
            startMarker.switchType = SwitchType.normal;
            endMarker.selectType = SelectType.fixed;
            endMarker.switchType = SwitchType.normal;
          }
          //レール選択解除(分岐レール)
          else if (!canSelectSwitchPos && switchMarkerList) {
            switchMarkerList = null;
            switchMarkerData.put(entity, null);
          }
          //レール分割選択解除
          else if (splitRailList !== null) {
            splitRailList = null;
            splitRailData.put(entity, null);
          }
          //レール選択解除(普通レール)
          else if (startMarker && startMarker.selectType === SelectType.fixed) {
            endMarker = null;
            startMarker = null;
            endMarkerData.put(entity, null);
            startMarkerData.put(entity, null);
          } else {
            if (midPos !== null) {
              //中点削除
              midPos = null;
              midPosData.put(entity, null);
              startMarker.setMarker(endMarker, null); //midPos削除のため設定し直す
            } else if (canSelectMidPos) {
              //中点選択OFF
              canSelectMidPos = false;
              dataMap.setBoolean("canSelectMidPos", false, 0);
            } else if (endMarker !== null) {
              //終点削除
              endMarker = null;
              endMarkerData.put(entity, null);
              startMarker.uninitialize();
              startMarkerData.put(entity, startMarker);
            } else if (startMarker !== null) {
              //始点削除
              startMarker = null;
              startMarkerData.put(entity, null);
            }
          }
        }
      }

      //生成
      if (
        Keyboard.isKeyDown(KeyMaps.build) &&
        (holdingRailItem || hasRailMarker)
      ) {
        var buildData = null;
        if (startMarker && endMarker && !switchMarkerList) {
          buildData = [startMarker.createRPData(), endMarker.createRPData()];
        } else if (switchMarkerList) {
          buildData = [];
          for (var i = 0; i < switchMarkerList.length; i++) {
            buildData.push(switchMarkerList[i].createRPData());
          }
        } else if (splitRailList) {
          buildData = [
            splitRailList[0].createRPData(),
            splitRailList[1].createRPData(),
            splitRailList[2].createRPData(),
            splitRailList[3].createRPData()
          ];
        }

        if (buildData) {
          if (transitionCurveData) transitionCurveBezierData.put(entity, null);
          dataMap.setBoolean("isBuilding", true, 1);
          //buildData = JSON.stringify(buildData).replace(/,/g, "☆");
          buildData = JSON.stringify(buildData).split(",").join("\u2606");
          dataMap.setString("buildData", buildData, 1);
        }
      }

      //削除
      if (Keyboard.isKeyDown(KeyMaps.deleteRail) && !canSelectSwitchPos) {
        var deletePosList = null;
        if (
          startMarker &&
          endMarker &&
          startMarker.selectType === SelectType.fixed &&
          endMarker.selectType === SelectType.fixed
        ) {
          deletePosList = [
            startMarker.blockX,
            startMarker.blockY,
            startMarker.blockZ
          ];
        } else if (switchMarkerList) {
          deletePosList = [
            switchMarkerList[0].blockX,
            switchMarkerList[0].blockY,
            switchMarkerList[0].blockZ
          ];
        }
        if (deletePosList) {
          //var deleteRailData = JSON.stringify(deletePosList).replace(/,/g, "☆");
          var deleteRailData = JSON.stringify(deletePosList)
            .split(",")
            .join("\u2606");
          dataMap.setBoolean("isBuilding", true, 1);
          dataMap.setString("deleteRailData", deleteRailData, 1);
        }
      }
    }

    //##-----------------##
    //##    ヘルプ描画    ##
    //##-----------------##
    if (lookingCursorPos) {
      var toPlayerVec = new Vec3(
        lookingCursorPos.posX - posX,
        lookingCursorPos.posY - posY,
        lookingCursorPos.posZ - posZ
      );
      var lang = NGTUtilClient.getMinecraft()
        .func_135016_M()
        .func_135041_c()
        .func_135034_a()
        .toLowerCase();
      if (langList.indexOf(lang) === -1) lang = langList[0];
      var renderHelp = function (index) {
        renderPartCoordinates(
          help[lang][index],
          lookingCursorPos.posX,
          lookingCursorPos.posY,
          lookingCursorPos.posZ,
          posX,
          posY,
          posZ,
          toPlayerVec.getYaw() + 180,
          toPlayerVec.getPitch()
        );
      };
      if (!isHideHelp) {
        var checker = null;
        if (startMarker && endMarker)
          checker = new CheckType(startMarker, endMarker);
        //設定
        renderHelp(1);
        //初期選択
        if (!startMarker && !endMarker && !splitRailList && !switchMarkerList)
          renderHelp(2);
        //終点選択
        if (startMarker && !endMarker && !splitRailList && !switchMarkerList)
          renderHelp(3);
        //マーカー選択後
        if (
          startMarker &&
          endMarker &&
          !canSelectMidPos &&
          !canSelectSwitchPos &&
          !checker.include(SelectType.fixed) &&
          !checker.checkSet(SelectType.connectRail, SelectType.connectRail) &&
          !splitRailList &&
          !switchMarkerList
        ) {
          if (checker.include(SelectType.connectRail)) renderHelp(12);
          else renderHelp(4);
        }
        //カーブ編集モード
        if (
          canSelectMidPos &&
          !checker.include(SelectType.connectRail) &&
          !checker.include(SelectType.fixed) &&
          !checker.include(SelectType.switch)
        )
          renderHelp(5);
        //カーブ編集モード(片側固定)
        if (
          canSelectMidPos &&
          (checker.checkSet(SelectType.connectRail, SelectType.block) ||
            checker.checkSet(SelectType.connectRail, SelectType.pos))
        )
          renderHelp(6);
        //レール分割
        if (splitRailList) renderHelp(7);
        //レール選択
        if (
          (switchMarkerList &&
            switchMarkerList.length === 3 &&
            !canSelectSwitchPos) ||
          (startMarker &&
            endMarker &&
            checker.checkSet(SelectType.fixed, SelectType.fixed) &&
            !canSelectSwitchPos)
        )
          renderHelp(8);
        //分岐編集モード
        if (
          canSelectSwitchPos &&
          ((startMarker &&
            (!switchMarkerList ||
              (switchMarkerList && switchMarkerList.length === 2))) ||
            (!startMarker && switchMarkerList && switchMarkerList.length === 3))
        ) {
          if (switchMarkerList && switchMarkerList.length === 3) renderHelp(13);
          else renderHelp(9);
        }
        //マーカー選択後(両方固定)
        if (
          startMarker &&
          endMarker &&
          checker.checkSet(SelectType.connectRail, SelectType.connectRail)
        )
          renderHelp(10);
        //マーカー選択後(分岐選択後)
        if (
          canSelectSwitchPos &&
          switchMarkerList &&
          ((startMarker && switchMarkerList.length === 3) ||
            switchMarkerList.length === 4)
        )
          renderHelp(10);
        //レール選択(両渡り分岐)
        if (
          switchMarkerList &&
          switchMarkerList.length === 4 &&
          !canSelectSwitchPos
        )
          renderHelp(11);
      } else {
        //ヘルプを開く
        renderHelp(0);
      }
    }

    //##------------##
    //##    描画    ##
    //##------------##

    //##  緩和曲線補助線  ##
    if (transitionCurveData) {
      var curveEndMarker = transitionCurveData.endMarker;
      renderPartCoordinates(
        selectableCursor,
        curveEndMarker.posX,
        curveEndMarker.posY,
        curveEndMarker.posZ,
        posX,
        posY,
        posZ
      );
      //renderCurve(previewLine1, null, transitionCurveData.bezier, 0, 0, posX, posY, posZ);
      //renderAnchor(startMarker, posX, posY, posZ, previewAnchorLine);
      //renderAnchor(transitionCurveData.endMarker, posX, posY, posZ, previewAnchorLine);
    }

    //##  スタートマーカー  ##
    if (startMarker) {
      renderMarkerCantPanel(startMarker, posX, posY, posZ);
      renderMarker(startMarker, posX, posY, posZ);
    }

    //##  エンドマーカー  ##
    if (endMarker) {
      renderMarkerCantPanel(endMarker, posX, posY, posZ);
      renderMarker(endMarker, posX, posY, posZ);
    }

    //##  中点  ##
    if (midPos) {
      renderPartCoordinates(
        selectedCursor,
        midPos.x,
        midPos.y,
        midPos.z,
        posX,
        posY,
        posZ
      );
    }

    //##  ライン  ##
    if (startMarker && endMarker) {
      renderAnchor(startMarker, posX, posY, posZ, anchorLine);
      renderAnchor(endMarker, posX, posY, posZ, anchorLine);
      renderCurveFromMarker(
        selectedLine,
        startMarker,
        endMarker,
        midPos,
        posX,
        posY,
        posZ
      );
      renderCurveRadius(startMarker, endMarker, midPos, posX, posY, posZ, 0);
    }

    //レール分割モード表示
    if (splitRailList) {
      //レール1
      renderMarker(splitRailList[0], posX, posY, posZ);
      renderMarker(splitRailList[1], posX, posY, posZ);
      renderAnchor(splitRailList[0], posX, posY, posZ, anchorLine);
      renderAnchor(splitRailList[1], posX, posY, posZ, anchorLine);
      renderCurveFromMarker(
        selectedLine,
        splitRailList[0],
        splitRailList[1],
        null,
        posX,
        posY,
        posZ
      );
      //レール2
      renderMarker(splitRailList[2], posX, posY, posZ);
      renderMarker(splitRailList[3], posX, posY, posZ);
      renderAnchor(splitRailList[2], posX, posY, posZ, anchorLine);
      renderAnchor(splitRailList[3], posX, posY, posZ, anchorLine);
      renderCurveFromMarker(
        selectedLine,
        splitRailList[2],
        splitRailList[3],
        null,
        posX,
        posY,
        posZ
      );
      //カント
      renderMarkerCantPanel(splitRailList[0], posX, posY, posZ);
      renderMarkerCantPanel(splitRailList[1], posX, posY, posZ);
      renderMarkerCantPanel(splitRailList[3], posX, posY, posZ);
      //距離
      var bezierSplit1 = getBezierFromMarkers(
        splitRailList[0],
        splitRailList[1]
      );
      var lengthSplit1 = bezierSplit1.getLength();
      var centerSplit1 = bezierSplit1.getPoint(2, 1);
      renderDistancePanel(
        lengthSplit1,
        centerSplit1[0],
        centerSplit1[1],
        centerSplit1[2],
        posX,
        posY,
        posZ
      );
      var bezierSplit2 = getBezierFromMarkers(
        splitRailList[2],
        splitRailList[3]
      );
      var lengthSplit2 = bezierSplit2.getLength();
      var centerSplit2 = bezierSplit2.getPoint(2, 1);
      renderDistancePanel(
        lengthSplit2,
        centerSplit2[0],
        centerSplit2[1],
        centerSplit2[2],
        posX,
        posY,
        posZ
      );
    }

    //分岐レール描画
    if (switchMarkerList) {
      if (switchMarkerList.length === 3) {
        var rootMarker = switchMarkerList[0];
        var marker1 = switchMarkerList[1];
        var marker2 = switchMarkerList[2];
        renderMarker(rootMarker, posX, posY, posZ);
        renderMarker(marker1, posX, posY, posZ);
        renderMarker(marker2, posX, posY, posZ);
        renderAnchor(rootMarker, posX, posY, posZ, anchorLine);
        renderAnchor(marker1, posX, posY, posZ, anchorLine);
        renderAnchor(marker2, posX, posY, posZ, anchorLine);
        renderCurveFromMarker(
          selectedLine,
          rootMarker,
          marker1,
          null,
          posX,
          posY,
          posZ
        );
        renderCurveFromMarker(
          selectedLine,
          rootMarker,
          marker2,
          null,
          posX,
          posY,
          posZ
        );
      } else if (switchMarkerList.length === 4) {
        var marker0 = switchMarkerList[0];
        var marker1 = switchMarkerList[1];
        var marker2 = switchMarkerList[2];
        var marker3 = switchMarkerList[3];
        renderMarker(marker0, posX, posY, posZ);
        renderMarker(marker1, posX, posY, posZ);
        renderMarker(marker2, posX, posY, posZ);
        renderMarker(marker3, posX, posY, posZ);
        renderAnchor(marker0, posX, posY, posZ, anchorLine);
        renderAnchor(marker1, posX, posY, posZ, anchorLine);
        renderAnchor(marker2, posX, posY, posZ, anchorLine);
        renderAnchor(marker3, posX, posY, posZ, anchorLine);
        renderCurveFromMarker(
          selectedLine,
          marker0,
          marker1,
          null,
          posX,
          posY,
          posZ
        );
        renderCurveFromMarker(
          selectedLine,
          marker0,
          marker2,
          null,
          posX,
          posY,
          posZ
        );
        renderCurveFromMarker(
          selectedLine,
          marker3,
          marker1,
          null,
          posX,
          posY,
          posZ
        );
        renderCurveFromMarker(
          selectedLine,
          marker3,
          marker2,
          null,
          posX,
          posY,
          posZ
        );
      }
    }

    //##  レール接続線  ##
    if (startMarker && startMarker.selectType === SelectType.connectRail) {
      var connectRailTilePos = startMarker.getConnectPos();
      var connectRailTile = getTileEntity(
        world,
        connectRailTilePos.x,
        connectRailTilePos.y,
        connectRailTilePos.z
      );
      if (
        connectRailTile &&
        connectRailTile instanceof TileEntityLargeRailBase &&
        getAllRailMapsFromTile(connectRailTile)
      ) {
        //1.接続レールの平均カーブ半径を出す
        var railMap = getNearestRPAndRM(
          world,
          connectRailTile,
          connectRailTilePos.x,
          connectRailTilePos.y,
          connectRailTilePos.z
        ).railMap;
        if (railMap) {
          var split = Math.floor(railMap.getLength() * 2);
          var halfIdx = Math.floor(split / 2);
          var halfRailPos = railMap.getRailPos(split, halfIdx);
          var halfPos = {
            x: halfRailPos[1],
            y: railMap.getRailHeight(split, halfIdx),
            z: halfRailPos[0],
            yaw: normalizeYaw(railMap.getRailRotation(split, halfIdx))
          };
          var edgePos = {
            x: startMarker.posX,
            y: startMarker.posY,
            z: startMarker.posZ,
            yaw: normalizeYaw(startMarker.anchorVec.getYaw())
          };
          var curveRadius = getCurveData2p(
            halfPos.x,
            halfPos.y,
            halfPos.z,
            halfPos.yaw,
            edgePos.x,
            edgePos.y,
            edgePos.z,
            edgePos.yaw
          ).radius;
          //2.終端座標を出す
          var endPos = continueCurveEndPos(
            startMarker.posX,
            startMarker.posY,
            startMarker.posZ,
            startMarker.anchorVec.getYaw(),
            curveRadius,
            maxCurveLength
          );
          var straightAnchorLength = getAnchorLength(
            edgePos.x,
            edgePos.y,
            edgePos.z,
            endPos.x,
            endPos.y,
            endPos.z
          );
          //3.中心角を出す
          var toEndVec = new Vec3(
            endPos.x - edgePos.x,
            0,
            endPos.z - edgePos.z
          );
          var curveAngle = relativeYaw(edgePos.yaw, toEndVec.getYaw()) * 2;
          //4.アンカーの長さを出す
          var crossPos = getAnchorPosFromCircleFixed1(
            startMarker,
            endPos.x,
            endPos.y,
            endPos.z
          );
          var crossPosVec = new Vec3(
            crossPos.x - endPos.x,
            crossPos.y - endPos.y,
            crossPos.z - endPos.z
          );
          var anchorLength = getAnchorLengthFromCircle(curveRadius, curveAngle);
          if (anchorLength === null) anchorLength = straightAnchorLength;
          //5.アンカーベクトル作成
          var endAnchorVec = crossPosVec.multi(
            anchorLength / crossPosVec.length()
          );
          var startAnchorVec = startMarker.anchorVec.multi(
            anchorLength / startMarker.anchorVec.length()
          );
          //6.描画
          var connectCurveBezier = getBezier(
            startMarker.posX,
            startMarker.posY,
            startMarker.posZ,
            startAnchorVec,
            endPos.x,
            endPos.y,
            endPos.z,
            endAnchorVec
          );
          renderCurve(
            connectLine,
            null,
            connectCurveBezier,
            0,
            0,
            posX,
            posY,
            posZ
          );
          if (curveRadius < maxCurveRadius) {
            //直線のアンカーも作成
            var endPos = continueCurveEndPos(
              startMarker.posX,
              startMarker.posY,
              startMarker.posZ,
              startMarker.anchorVec.getYaw(),
              Infinity,
              maxCurveLength
            );
            anchorLength = straightAnchorLength;
            var crossPos = getAnchorPosFromCircleFixed1(
              startMarker,
              endPos.x,
              endPos.y,
              endPos.z
            );
            var crossPosVec = new Vec3(
              crossPos.x - endPos.x,
              crossPos.y - endPos.y,
              crossPos.z - endPos.z
            );
            var endAnchorVec = crossPosVec.multi(
              anchorLength / crossPosVec.length()
            );
            var startAnchorVec = startMarker.anchorVec.multi(
              anchorLength / startMarker.anchorVec.length()
            );
            var connectCurveBezier = getBezier(
              startMarker.posX,
              startMarker.posY,
              startMarker.posZ,
              startAnchorVec,
              endPos.x,
              endPos.y,
              endPos.z,
              endAnchorVec
            );
            renderCurve(
              previewLine2,
              null,
              connectCurveBezier,
              0,
              0,
              posX,
              posY,
              posZ
            );
          }
        }
      }
    }

    //##  複線補助線  ##
    if (lookingCursorPos) {
      var tileEntityList = getAroundTileEntity(
        world,
        lookingCursorPos.posX,
        lookingCursorPos.posY + offsetY,
        lookingCursorPos.posZ,
        sideRailWidth * sideRailAmount * 2
      );
      var railMapList = [];
      for (var i = 0; i < tileEntityList.length; i++) {
        var tile = tileEntityList[i];
        if (
          tile instanceof TileEntityLargeRailBase &&
          tile.getRailCore() !== null
        ) {
          var railMaps = getAllRailMapsFromTile(tile);
          for (var rmIdx = 0; rmIdx < railMaps.length; rmIdx++) {
            var railMap = railMaps[rmIdx];
            if (railMapList.indexOf(railMap) === -1) railMapList.push(railMap);
          }
        }
      }
      railMapList.forEach(function (rm) {
        var split = Math.floor(rm.getLength() * 2);
        for (var i = 0; i <= split; i++) {
          var pos = rm.getRailPos(split, i);
          var height = rm.getRailHeight(split, i);
          var yaw = rm.getRailRotation(split, i);
          var pitch =
            isKaizPatch || !isOldVer
              ? rm.getRailPitch(split, i)
              : rm.getRailPitch();
          GL11.glPushMatrix();
          GL11.glTranslatef(pos[1], height, pos[0]);
          GL11.glTranslatef(-posX, -posY, -posZ);
          GL11.glRotatef(yaw, 0, 1, 0);
          GL11.glRotatef(-pitch, 1, 0, 0);

          for (var j = 1; j <= sideRailAmount; j++) {
            var offsetX = sideRailWidth * j;
            GL11.glPushMatrix();
            GL11.glTranslatef(offsetX, 0, 0);
            previewLine2.render(renderer);
            GL11.glPopMatrix();
            GL11.glPushMatrix();
            GL11.glTranslatef(-offsetX, 0, 0);
            previewLine2.render(renderer);
            GL11.glPopMatrix();
          }

          GL11.glPopMatrix();
        }
      });
    }

    //##  選択カーソル/ライン  ##
    var dummyEndMarker = null;
    var dummyMidPos = null;
    if (lookingCursorPos) {
      var lookBlockX = lookingCursorPos.blockX;
      var lookBlockY = lookingCursorPos.blockY;
      var lookBlockZ = lookingCursorPos.blockZ;
      var aroundRailData = getAroundRailData(
        world,
        lookBlockX,
        lookBlockY + offsetY,
        lookBlockZ
      );
      var onTileEntity = getTileEntity(
        world,
        lookBlockX,
        lookBlockY + offsetY,
        lookBlockZ
      );
      if (!onTileEntity)
        onTileEntity = getTileEntity(
          world,
          lookBlockX,
          lookBlockY + offsetY - 1,
          lookBlockZ
        );
      var isPointingRail = onTileEntity instanceof TileEntityLargeRailBase;
      var isUnavailableSelect = false;
      if (
        startMarker &&
        startMarker.blockX === lookingCursorPos.blockX &&
        startMarker.blockZ === lookingCursorPos.blockZ
      )
        isUnavailableSelect = true;
      if (startMarker && aroundRailData && aroundRailData.isRPSnap) {
        var connectBlockPos = getConnectPos(aroundRailData.rp);
        if (
          startMarker.blockX === connectBlockPos.x &&
          startMarker.blockZ === connectBlockPos.z
        )
          isUnavailableSelect = true;
      }
      if (canSelectSwitchPos) isUnavailableSelect = true;
      if (splitRailList) isUnavailableSelect = true;

      //通常モード
      if (
        !canSelectMidPos &&
        !isKeyDown_Option &&
        !aroundRailData &&
        !isUnavailableSelect
      ) {
        for (var i = 0; i <= railHeight; i++) {
          renderPartCoordinates(
            selectCursorMarker,
            lookBlockX + 0.5,
            lookBlockY + offsetY + i / 16,
            lookBlockZ + 0.5,
            posX,
            posY,
            posZ
          );
        }
        renderAuxiliaryLine(
          lookBlockX + 0.5,
          lookBlockY + offsetY + railHeight / 16,
          lookBlockZ + 0.5,
          startMarker,
          posX,
          posY,
          posZ
        );
        if (startMarker && !endMarker) {
          dummyEndMarker = new Marker(
            SelectType.block,
            lookingCursorPos.blockX,
            lookingCursorPos.blockY + offsetY,
            lookingCursorPos.blockZ,
            null,
            railHeight,
            railCant,
            railGuage,
            null,
            null
          );
        }
      }

      //レール接続モード
      if (
        !canSelectMidPos &&
        !isKeyDown_Option &&
        aroundRailData &&
        aroundRailData.isRPSnap &&
        !isUnavailableSelect
      ) {
        var connectBlockPos = getConnectPos(aroundRailData.rp);
        renderPartCoordinates(
          snapCursorMarker,
          connectBlockPos.x + 0.5,
          connectBlockPos.y,
          connectBlockPos.z + 0.5,
          posX,
          posY,
          posZ
        );
        if (startMarker && !endMarker) {
          var connectRailMap = getNearestRPAndRM(
            world,
            aroundRailData.tile,
            connectBlockPos.x,
            connectBlockPos.y,
            connectBlockPos.z
          ).railMap;
          var cantHeight =
            isKaizPatch || !isOldVer
              ? railGuage.guage *
                NGTMath.sin(Math.abs(aroundRailData.rp.cantEdge))
              : 0;
          var anchorYaw =
            isKaizPatch || !isOldVer
              ? aroundRailData.rp.anchorYaw
              : aroundRailData.rp.anchorDirection;
          var anchorPitch =
            isKaizPatch || !isOldVer
              ? aroundRailData.rp.anchorPitch
              : connectRailMap.getRailPitch();
          if (
            anchorPitch === 0 &&
            (isKaizPatch || !isOldVer) &&
            connectRailMap
          ) {
            //縦曲線未設定による代替処理
            var railMap = connectRailMap;
            var split = Math.floor(railMap.getLength() * 2);
            anchorPitch = railMap.getRailPitch(split, 0);
          }
          dummyEndMarker = new Marker(
            SelectType.connectRail,
            connectBlockPos.x,
            connectBlockPos.y,
            connectBlockPos.z,
            (aroundRailData.rp.direction + 4) % 8,
            aroundRailData.rp.height,
            cantHeight,
            railGuage,
            normalizeYaw(anchorYaw + 180),
            -anchorPitch
          );
        }
      }

      //レール再構築モード
      if (
        !startMarker &&
        !isKeyDown_Option &&
        aroundRailData &&
        !aroundRailData.isRPSnap &&
        !isUnavailableSelect
      ) {
        if (isSwitchRail(aroundRailData.tile)) {
          var railMaps = getAllRailMapsFromTile(aroundRailData.tile);
          for (var i = 0; i < railMaps.length; i++) {
            renderCurveFromRailMap(deleteLine, railMaps[i], posX, posY, posZ);
          }
        } else {
          var railMap = aroundRailData.tile.getRailMap(null);
          renderCurveFromRailMap(deleteLine, railMap, posX, posY, posZ);
        }
      }

      //レール分割モード(未指定)
      if (
        !startMarker &&
        isKeyDown_Option &&
        aroundRailData &&
        !aroundRailData.isRPSnap &&
        !isUnavailableSelect &&
        !splitRailList &&
        !isSwitchRail(aroundRailData.tile)
      ) {
        var railMaps = getAllRailMapsFromTile(aroundRailData.tile);
        var railMap = railMaps.length !== 0 ? railMaps[0] : null;
        var snapPosList = getSplitPosList(railMap, railPosAccuracy);
        var splitPos = getNearestPosFromList(
          snapPosList,
          lookingCursorPos.posX,
          lookingCursorPos.posY,
          lookingCursorPos.posZ,
          railSnapDistance
        );
        for (var i = 0; i < snapPosList.length; i++) {
          var snapPos = snapPosList[i];
          renderPartCoordinates(
            selectableCursor,
            snapPos[0],
            snapPos[1],
            snapPos[2],
            posX,
            posY,
            posZ
          );
        }
        if (splitPos)
          renderPartCoordinates(
            selectCursor,
            splitPos[0],
            splitPos[1],
            splitPos[2],
            posX,
            posY,
            posZ
          );
      }

      //向き固定モード
      if (
        !canSelectMidPos &&
        isKeyDown_Option &&
        !isPointingRail &&
        !isUnavailableSelect
      ) {
        var dirIndex = MarkerDirection.getDirFromPos(
          lookingCursorPos.blockX,
          lookingCursorPos.blockZ,
          lookingCursorPos.snapX,
          lookingCursorPos.snapZ
        );
        renderPartCoordinates(
          selectCursor,
          lookingCursorPos.snapX,
          lookingCursorPos.blockY + offsetY + railHeight / 16,
          lookingCursorPos.snapZ,
          posX,
          posY,
          posZ
        );
        renderPartCoordinates(
          dirMarker[Number(dirIndex + 8)],
          lookingCursorPos.blockX + 0.5,
          lookingCursorPos.blockY + offsetY + railHeight / 16,
          lookingCursorPos.blockZ + 0.5,
          posX,
          posY,
          posZ
        );
        for (var i = 0; i <= railHeight; i++) {
          renderPartCoordinates(
            selectCursorMarker,
            lookBlockX + 0.5,
            lookBlockY + offsetY + i / 16,
            lookBlockZ + 0.5,
            posX,
            posY,
            posZ
          );
        }
        renderAuxiliaryLine(
          lookBlockX + 0.5,
          lookBlockY + offsetY + railHeight / 16,
          lookBlockZ + 0.5,
          startMarker,
          posX,
          posY,
          posZ
        );
        if (startMarker && !endMarker) {
          dummyEndMarker = new Marker(
            SelectType.pos,
            lookingCursorPos.blockX,
            lookingCursorPos.blockY + offsetY,
            lookingCursorPos.blockZ,
            dirIndex,
            railHeight,
            railCant,
            railGuage,
            null,
            null
          );
        }
      }

      //中点設置-スナップ設置
      var checker = new CheckType(startMarker, endMarker);
      if (
        canSelectMidPos &&
        !isKeyDown_Option &&
        !checker.include(SelectType.connectRail) &&
        !checker.include(SelectType.switch)
      ) {
        dummyMidPos = getMidPosAtCircle(
          startMarker.posX,
          startMarker.posY,
          startMarker.posZ,
          endMarker.posX,
          endMarker.posY,
          endMarker.posZ,
          lookingCursorPos.posX,
          lookingCursorPos.posY,
          lookingCursorPos.posZ
        );
        renderPartCoordinates(
          selectCursor,
          dummyMidPos.x,
          dummyMidPos.y,
          dummyMidPos.z,
          posX,
          posY,
          posZ
        );
      }

      //中点設置-自由設置
      if (
        canSelectMidPos &&
        (isKeyDown_Option ||
          checker.include(SelectType.connectRail) ||
          checker.include(SelectType.switch))
      ) {
        renderPartCoordinates(
          selectCursor,
          lookingCursorPos.posX,
          lookingCursorPos.blockY + offsetY + railHeight / 16,
          lookingCursorPos.posZ,
          posX,
          posY,
          posZ
        );
        dummyMidPos = {
          x: lookingCursorPos.posX,
          y: lookingCursorPos.blockY + offsetY + railHeight / 16,
          z: lookingCursorPos.posZ,
          isSnap: false
        };
      }

      //オフセット線
      if (offsetY >= 1 && !canSelectMidPos) {
        if (canSelectSwitchPos && switchMarkerList)
          offsetY = switchMarkerList[0].blockY - lookBlockY;
        if (
          canSelectSwitchPos &&
          startMarker &&
          startMarker.selectType === SelectType.fixed
        )
          offsetY = startMarker.blockY - lookBlockY;
        for (var i = 1; i < offsetY; i++) {
          var offsetLinePart = i === 1 ? offsetYLine_ground : offsetYLine;
          renderPartCoordinates(
            offsetLinePart,
            lookBlockX + 0.5,
            lookBlockY + i,
            lookBlockZ + 0.5,
            posX,
            posY,
            posZ
          );
        }
      }

      //カントパネル(未選択)
      if (!startMarker || !endMarker) {
        renderCantPanel(
          railCant,
          lookingCursorPos.posX,
          lookingCursorPos.blockY + offsetY,
          lookingCursorPos.posZ,
          posX,
          posY,
          posZ
        );
      }

      //距離パネル/相対座標パネル
      if (startMarker && !endMarker) {
        var startPos = startMarker.getPos();
        var startToCursorVec = new Vec3(
          lookingCursorPos.posX - startPos.x,
          lookingCursorPos.blockY + offsetY - startPos.y,
          lookingCursorPos.posZ - startPos.z
        );
        var distance = Math.round(startToCursorVec.length());
        GL11.glPushMatrix();
        GL11.glTranslatef(0, 4, 0);
        renderDistancePanel(
          distance,
          lookingCursorPos.posX,
          lookingCursorPos.blockY + offsetY,
          lookingCursorPos.posZ,
          posX,
          posY,
          posZ
        );
        GL11.glTranslatef(0, 2, 0);
        renderRelativePosPanel(
          [startMarker.blockX, startMarker.blockZ],
          [lookingCursorPos.blockX, lookingCursorPos.blockZ],
          lookingCursorPos.posX,
          lookingCursorPos.blockY + offsetY,
          lookingCursorPos.posZ,
          posX,
          posY,
          posZ
        );
        GL11.glPopMatrix();
      }
      if (startMarker && endMarker) {
        var bezier = getBezierFromMarkers(startMarker, endMarker);
        var bezierLength = bezier.getLength();
        var centerPos = bezier.getPoint(2, 1);
        GL11.glPushMatrix();
        GL11.glTranslatef(0, 2, 0);
        renderDistancePanel(
          bezierLength,
          centerPos[0],
          centerPos[1],
          centerPos[2],
          posX,
          posY,
          posZ
        );
        GL11.glTranslatef(0, 2, 0);
        renderRelativePosPanel(
          [startMarker.blockX, startMarker.blockZ],
          [endMarker.blockX, endMarker.blockZ],
          centerPos[0],
          centerPos[1],
          centerPos[2],
          posX,
          posY,
          posZ
        );
        GL11.glPopMatrix();
      }

      //マーカー(分岐作成モード)
      if (
        canSelectSwitchPos &&
        startMarker &&
        endMarker &&
        (!switchMarkerList ||
          (switchMarkerList && switchMarkerList.length === 2))
      ) {
        //遠い方を分岐始点に変換
        var nearestMarker = getNearestMarker(
          startMarker,
          endMarker,
          lookingCursorPos.posX,
          lookingCursorPos.posY,
          lookingCursorPos.posZ
        );
        var otherMarker =
          nearestMarker === startMarker ? endMarker : startMarker;
        switchMarkerList = [otherMarker, nearestMarker];
      }
      if (canSelectSwitchPos) {
        var rootY = switchMarkerList[0].blockY;
        var rootHeight = switchMarkerList[0].railHeight;
        var railTile = getTileEntity(
          world,
          lookingCursorPos.blockX,
          lookingCursorPos.blockY,
          lookingCursorPos.blockZ
        );
        if (!(railTile instanceof TileEntityLargeRailBase)) railTile = null;
        //普通選択
        if (!isKeyDown_Option && !railTile) {
          for (var i = 0; i <= rootHeight; i++) {
            renderPartCoordinates(
              selectCursorMarker,
              lookBlockX + 0.5,
              rootY + i / 16,
              lookBlockZ + 0.5,
              posX,
              posY,
              posZ
            );
          }
          dummyEndMarker = new Marker(
            SelectType.block,
            lookingCursorPos.blockX,
            rootY,
            lookingCursorPos.blockZ,
            null,
            rootHeight,
            railCant,
            railGuage,
            null,
            null
          );
        }
        //向き固定選択
        if (isKeyDown_Option && !railTile) {
          var dirIndex = MarkerDirection.getDirFromPos(
            lookingCursorPos.blockX,
            lookingCursorPos.blockZ,
            lookingCursorPos.snapX,
            lookingCursorPos.snapZ
          );
          renderPartCoordinates(
            dirMarker[Number(dirIndex + 8)],
            lookingCursorPos.blockX + 0.5,
            rootY + rootHeight / 16,
            lookingCursorPos.blockZ + 0.5,
            posX,
            posY,
            posZ
          );
          renderPartCoordinates(
            selectCursor,
            lookingCursorPos.snapX,
            rootY + rootHeight / 16,
            lookingCursorPos.snapZ,
            posX,
            posY,
            posZ
          );
          for (var i = 0; i <= rootHeight; i++) {
            renderPartCoordinates(
              selectCursorMarker,
              lookBlockX + 0.5,
              rootY + i / 16,
              lookBlockZ + 0.5,
              posX,
              posY,
              posZ
            );
          }
          dummyEndMarker = new Marker(
            SelectType.pos,
            lookingCursorPos.blockX,
            rootY,
            lookingCursorPos.blockZ,
            dirIndex,
            rootHeight,
            railCant,
            railGuage,
            null,
            null
          );
        }
        //レール接続
        if (railTile) {
          var connectRailData = getNearestRPAndRM(
            world,
            railTile,
            lookingCursorPos.blockX,
            lookingCursorPos.blockY,
            lookingCursorPos.blockZ
          );
          var isSelfConnect = false;
          if (connectRailData.railPosition === null) isSelfConnect = true;
          for (var i = 0; i < switchMarkerList.length; i++) {
            if (isSelfConnect) continue;
            var markerX = switchMarkerList[i].blockX;
            var markerY = switchMarkerList[i].blockY;
            var markerZ = switchMarkerList[i].blockZ;
            var rpX = connectRailData.railPosition.blockX;
            var rpY = connectRailData.railPosition.blockY;
            var rpZ = connectRailData.railPosition.blockZ;
            if (markerX === rpX && markerY === rpY && markerZ === rpZ)
              isSelfConnect = true;
          }
          if (!isSelfConnect) {
            var connectBlockPos = getConnectPos(connectRailData.railPosition);
            renderPartCoordinates(
              snapCursorMarker,
              connectBlockPos.x + 0.5,
              connectBlockPos.y,
              connectBlockPos.z + 0.5,
              posX,
              posY,
              posZ
            );
            var cantHeight =
              isKaizPatch || !isOldVer
                ? railGuage.guage *
                  NGTMath.sin(Math.abs(connectRailData.railPosition.cantEdge))
                : 0;
            var anchorYaw =
              isKaizPatch || !isOldVer
                ? connectRailData.railPosition.anchorYaw
                : connectRailData.railPosition.anchorDirection;
            var anchorPitch =
              isKaizPatch || !isOldVer
                ? connectRailData.railPosition.anchorPitch
                : connectRailData.railMap.getRailPitch();
            if (
              anchorPitch === 0 &&
              (isKaizPatch || !isOldVer) &&
              connectRailData.railMap
            ) {
              //縦曲線未設定による代替処理
              var split = Math.floor(connectRailData.railMap.getLength() * 2);
              anchorPitch = connectRailData.railMap.getRailPitch(split, 0);
            }
            dummyEndMarker = new Marker(
              SelectType.connectRail,
              connectBlockPos.x,
              rootY,
              connectBlockPos.z,
              (connectRailData.railPosition.direction + 4) % 8,
              rootHeight,
              cantHeight,
              railGuage,
              normalizeYaw(anchorYaw + 180),
              -anchorPitch
            );
          }
        }
      }

      //分岐作成モードのプレビューライン(普通レール→分岐レール)
      if (
        startMarker &&
        endMarker &&
        canSelectSwitchPos &&
        (!switchMarkerList ||
          (switchMarkerList && switchMarkerList.length === 2)) &&
        dummyEndMarker
      ) {
        var nearestMarker = getNearestMarker(
          startMarker,
          endMarker,
          lookingCursorPos.posX,
          lookingCursorPos.posY,
          lookingCursorPos.posZ
        );
        var otherMarker =
          nearestMarker === startMarker ? endMarker : startMarker;
        var dummyStartMarker = otherMarker.copy();
        dummyStartMarker.setMarker(dummyEndMarker);
        renderCurveFromMarker(
          previewLine1,
          dummyStartMarker,
          dummyEndMarker,
          null,
          posX,
          posY,
          posZ
        );
        renderCurveRadius(
          dummyStartMarker,
          dummyEndMarker,
          null,
          posX,
          posY,
          posZ,
          0
        );
        renderAnchor(dummyEndMarker, posX, posY, posZ, previewAnchorLine);
      }

      //分岐作成モードのプレビューライン(分岐レール→分岐レール)
      if (
        !startMarker &&
        switchMarkerList &&
        switchMarkerList.length === 3 &&
        dummyEndMarker
      ) {
        var marker1 = switchMarkerList[1];
        var marker2 = switchMarkerList[2];
        var nearestMarker = changeMarker ? marker1 : marker2;
        var dummyStartMarker = nearestMarker.copy();
        dummyStartMarker.setMarker(dummyEndMarker, null);
        renderCurveFromMarker(
          previewLine1,
          marker1,
          dummyEndMarker,
          null,
          posX,
          posY,
          posZ
        );
        renderCurveFromMarker(
          previewLine1,
          marker2,
          dummyEndMarker,
          null,
          posX,
          posY,
          posZ
        );
        //renderCurveRadius(dummyStartMarker, dummyEndMarker, null, posX, posY, posZ, 0);
        renderAnchor(dummyEndMarker, posX, posY, posZ, previewAnchorLine);
      }

      //ライン(エンド指定)
      if (startMarker && dummyEndMarker && !canSelectSwitchPos) {
        var dummyStartMarker = startMarker.copy();
        dummyStartMarker.setMarker(dummyEndMarker, null);
        renderCurveFromMarker(
          previewLine1,
          dummyStartMarker,
          dummyEndMarker,
          null,
          posX,
          posY,
          posZ
        );
        renderCurveRadius(
          dummyStartMarker,
          dummyEndMarker,
          null,
          posX,
          posY,
          posZ,
          0
        );
        renderAnchor(dummyStartMarker, posX, posY, posZ, previewAnchorLine);
        renderAnchor(dummyEndMarker, posX, posY, posZ, previewAnchorLine);
      }

      //ライン(中点指定)
      if (startMarker && endMarker && !midPos && canSelectMidPos) {
        var dummyStartMarker = startMarker.copy();
        var dummyEndMarker = endMarker.copy();
        dummyStartMarker.setMarker(dummyEndMarker, dummyMidPos);
        renderCurveFromMarker(
          previewLine1,
          dummyStartMarker,
          dummyEndMarker,
          dummyMidPos,
          posX,
          posY,
          posZ
        );
        renderCurveRadius(
          dummyStartMarker,
          dummyEndMarker,
          dummyMidPos,
          posX,
          posY,
          posZ,
          2
        );
        renderAnchor(dummyStartMarker, posX, posY, posZ, previewAnchorLine);
        renderAnchor(dummyEndMarker, posX, posY, posZ, previewAnchorLine);
      }

      //勾配パネル
      if (startMarker && endMarker) {
        var dummyStartMarker = startMarker.copy();
        var dummyEndMarker = endMarker.copy();
        dummyStartMarker.setMarker(dummyEndMarker, dummyMidPos);
        var startAnchorVec = startMarker.anchorVec;
        var endAnchorVec = endMarker.anchorVec;
        GL11.glPushMatrix();
        GL11.glTranslatef(0, 2, 0);
        renderSlopePanel(
          startAnchorVec,
          dummyStartMarker.posX,
          dummyStartMarker.blockY + dummyStartMarker.railHeight / 16,
          dummyStartMarker.posZ,
          posX,
          posY,
          posZ
        );
        renderSlopePanel(
          endAnchorVec,
          dummyEndMarker.posX,
          dummyEndMarker.blockY + dummyEndMarker.railHeight / 16,
          dummyEndMarker.posZ,
          posX,
          posY,
          posZ
        );
        GL11.glPopMatrix();
      }
      if (startMarker && dummyEndMarker && !endMarker) {
        var dummyStartMarker = startMarker.copy();
        dummyStartMarker.setMarker(dummyEndMarker, dummyMidPos);
        var startAnchorVec = dummyStartMarker.anchorVec;
        var endAnchorVec = dummyEndMarker.anchorVec;
        GL11.glPushMatrix();
        GL11.glTranslatef(0, 2, 0);
        renderSlopePanel(
          startAnchorVec,
          dummyStartMarker.posX,
          dummyStartMarker.blockY + dummyStartMarker.railHeight / 16,
          dummyStartMarker.posZ,
          posX,
          posY,
          posZ
        );
        renderSlopePanel(
          endAnchorVec,
          lookingCursorPos.posX,
          lookingCursorPos.blockY + offsetY,
          lookingCursorPos.posZ,
          posX,
          posY,
          posZ
        );
        GL11.glPopMatrix();
      }
    }
  }
}

//##--------------------------##
//##    関数(サーバーと共通)    ##
//##--------------------------##
function doFollowing(entity, hostPlayer) {
  if (!entity || !hostPlayer || isOldVer) return;
  var x = hostPlayer.field_70165_t;
  var y = hostPlayer.field_70163_u + 2;
  var z = hostPlayer.field_70161_v;
  entity.func_70107_b(x, y, z);
  entity.field_70159_w = 0;
  entity.field_70181_x = 0;
  entity.field_70179_y = 0;
}

function getTileEntity(world, x, y, z) {
  if (isOldVer) return world.func_147438_o(x, y, z);
  else {
    var blockPos = new Packages.net.minecraft.util.math.BlockPos(
      Math.floor(x),
      Math.floor(y),
      Math.floor(z)
    );
    return world.func_175625_s(blockPos);
  }
}

function getSelectedSlotItem(player) {
  var inventory = player.field_71071_by;
  var index = inventory.field_70461_c;
  if (isOldVer) return inventory.field_70462_a[index];
  else return inventory.field_70462_a.get(index);
}

function hasPlayerMarker(player) {
  var item = getSelectedSlotItem(player);
  if (!item) return false;
  return item.func_77973_b() !== RTMBlock.marker;
}

function getPlayerRail(player) {
  var item = getSelectedSlotItem(player);
  if (!item) return null;
  if (item.func_77973_b() !== RTMItem.itemLargeRail) return null;
  if (isOldVer) {
    return ItemRail.getProperty(item);
  } else {
    var type = RTMResource.RAIL;
    var state = new ResourceStateRail(type, null);
    if (item.func_77942_o()) {
      state.readFromNBT(item.func_77978_p().func_74775_l("State"));
    } else {
      state.setResourceName(type.defaultName);
      var nbt = new NBTTagCompound();
      nbt.func_74782_a("State", state.writeToNBT());
      item.func_77982_d(nbt);
    }
    return state;
  }
}

var SwitchType = {
  normal: new java.lang.Byte(0),
  switch: new java.lang.Byte(1)
};

//##-----------------##
//##    関数(描画)    ##
//##-----------------##
function renderMarker(marker, entityX, entityY, entityZ) {
  for (var i = 0; i <= marker.railHeight; i++) {
    if (!marker.isInitiarized)
      renderPartCoordinates(
        selectedCursorMarker,
        marker.blockX + 0.5,
        marker.blockY + i / 16,
        marker.blockZ + 0.5,
        entityX,
        entityY,
        entityZ
      );
    else
      renderPartCoordinates(
        dirMarker[Number(marker.dir)],
        marker.blockX + 0.5,
        marker.blockY + i / 16,
        marker.blockZ + 0.5,
        entityX,
        entityY,
        entityZ
      );
  }
}

function renderMarkerCantPanel(marker, entityX, entityY, entityZ) {
  var markerPos = marker.getPos();
  var markerPosY = markerPos.y + marker.railHeight / 16;
  renderCantPanel(
    marker.cantHeight,
    markerPos.x,
    markerPosY,
    markerPos.z,
    entityX,
    entityY,
    entityZ
  );
}

function renderCantPanel(cant, posX, posY, posZ, entityX, entityY, entityZ) {
  renderDataPanel(
    cant,
    cantPanel,
    cantPanel_angle,
    cantPanel_mm,
    posX,
    posY,
    posZ,
    entityX,
    entityY,
    entityZ
  );
}

function renderDistancePanel(
  distance,
  posX,
  posY,
  posZ,
  entityX,
  entityY,
  entityZ
) {
  renderDataPanel(
    distance,
    distancePanel,
    distancePanel_D,
    distancePanel_M,
    posX,
    posY,
    posZ,
    entityX,
    entityY,
    entityZ
  );
}

function renderRelativePosPanel(
  startPos,
  endPos,
  posX,
  posY,
  posZ,
  entityX,
  entityY,
  entityZ
) {
  var dx = Math.round(Math.abs(endPos[0] - startPos[0]));
  var dz = Math.round(Math.abs(endPos[1] - startPos[1]));
  var gdc = getGCD(dx, dz);
  dx = Math.floor(dx / gdc); //約分する
  dz = Math.floor(dz / gdc); //約分する
  //相対Z座標
  renderDataPanel(
    dz,
    posZPanel,
    posZPanel_Z,
    null,
    posX,
    posY,
    posZ,
    entityX,
    entityY,
    entityZ
  );
  //相対X座標
  GL11.glTranslatef(0, 2, 0);
  renderDataPanel(
    dx,
    posXPanel,
    posXPanel_X,
    null,
    posX,
    posY,
    posZ,
    entityX,
    entityY,
    entityZ
  );
}

function renderSlopePanel(
  anchorVec,
  posX,
  posY,
  posZ,
  entityX,
  entityY,
  entityZ
) {
  var anchorPitch = Math.abs(anchorVec.getPitch());
  var radians = anchorPitch * (Math.PI / 180);
  var permil = Math.tan(radians) * 1000;
  renderDataPanel(
    permil,
    slopePanel,
    slopePanel_slope,
    slopePanel_permil,
    posX,
    posY,
    posZ,
    entityX,
    entityY,
    entityZ
  );
}

function renderAuxiliaryLine(
  posX,
  posY,
  posZ,
  startMarker,
  entityX,
  entityY,
  entityZ
) {
  renderPartCoordinates(
    auxiliaryLine,
    posX,
    posY,
    posZ,
    entityX,
    entityY,
    entityZ
  );
}

function renderDataPanel(
  data,
  panelNum,
  panelPrefix,
  panelUnit,
  posX,
  posY,
  posZ,
  entityX,
  entityY,
  entityZ
) {
  var toPlayerVec = new Vec3(entityX - posX, entityY - posY, entityZ - posZ);
  var string = Math.round(data).toString();
  GL11.glPushMatrix();
  GL11.glTranslatef(posX, posY, posZ);
  GL11.glTranslatef(-entityX, -entityY, -entityZ);
  GL11.glRotatef(toPlayerVec.getYaw() + 180, 0, 1, 0);
  GL11.glRotatef(toPlayerVec.getPitch(), 1, 0, 0);
  GL11.glTranslatef((string.length - 1) / 2, 0, 0);
  for (var i = 0; i < string.length; i++) {
    var num = Number(string.slice(i, i + 1));
    if (num < 0 || num > 9 || isNaN(num)) continue;
    GL11.glPushMatrix();
    GL11.glTranslatef(-i, 0, 0);
    panelNum[num].render(renderer);
    if (panelPrefix && i === 0) panelPrefix.render(renderer);
    if (panelUnit && i === string.length - 1) panelUnit.render(renderer);
    GL11.glPopMatrix();
  }
  GL11.glPopMatrix();
}

function renderPartCoordinates(
  part,
  x,
  y,
  z,
  entityX,
  entityY,
  entityZ,
  yaw,
  pitch,
  roll,
  scaleX,
  scaleY,
  scaleZ
) {
  yaw = yaw || 0;
  pitch = pitch || 0;
  roll = roll || 0;
  scaleX = scaleX === undefined ? 1 : scaleX;
  scaleY = scaleY === undefined ? 1 : scaleY;
  scaleZ = scaleZ === undefined ? 1 : scaleZ;
  GL11.glPushMatrix();
  GL11.glTranslatef(x, y, z);
  GL11.glTranslatef(-entityX, -entityY, -entityZ);
  GL11.glRotatef(yaw, 0, 1, 0);
  GL11.glRotatef(pitch, 1, 0, 0);
  GL11.glRotatef(roll, 0, 0, 1);
  GL11.glScalef(scaleX, scaleY, scaleZ);
  part.render(renderer);
  GL11.glPopMatrix();
}

function renderAnchor(marker, entityX, entityY, entityZ, part) {
  if (marker && marker.anchorVec) {
    GL11.glPushMatrix();
    GL11.glTranslatef(marker.posX, marker.posY, marker.posZ);
    GL11.glTranslatef(-entityX, -entityY, -entityZ);
    GL11.glRotatef(marker.anchorVec.getYaw(), 0, 1, 0);
    GL11.glRotatef(-marker.anchorVec.getPitch(), 1, 0, 0);
    GL11.glScalef(1, 1, marker.anchorVec.length());
    part.render(renderer);
    GL11.glPopMatrix();
  }
}

function renderCurve(
  part1,
  part2,
  bezier,
  cantStart,
  cantEnd,
  entityX,
  entityY,
  entityZ
) {
  var length = bezier.getLength();
  var split = Math.floor(length * 2);
  for (var i = 0; i <= split; i++) {
    var rate = i / split;
    var pos = bezier.getPoint(split, i);
    var yaw = bezier.getYaw(split, i);
    var pitch = bezier.getPitch(split, i);
    var roll = cantStart * (1 - rate) + cantEnd * rate;
    GL11.glPushMatrix();
    GL11.glTranslatef(pos[0], pos[1], pos[2]);
    GL11.glTranslatef(-entityX, -entityY, -entityZ);
    GL11.glRotatef(-yaw, 0, 1, 0);
    GL11.glRotatef(90, 0, 1, 0);
    GL11.glRotatef(-pitch, 1, 0, 0);
    GL11.glRotatef(-roll, 0, 0, 1);
    part1.render(renderer);
    if (part2 !== null && (i === 0 || i === split - 1)) part2.render(renderer);
    GL11.glPopMatrix();
  }
}

function renderCurveFromRailMap(part, railMap, entityX, entityY, entityZ) {
  var split = Math.floor(railMap.getLength() * 2);
  for (var i = 0; i <= split; i++) {
    var pos = railMap.getRailPos(split, i);
    var height = railMap.getRailHeight(split, i);
    var yaw = railMap.getRailRotation(split, i);
    var pitch =
      isKaizPatch || !isOldVer
        ? railMap.getRailPitch(split, i)
        : railMap.getRailPitch();
    GL11.glPushMatrix();
    GL11.glTranslatef(pos[1], height, pos[0]);
    GL11.glTranslatef(-entityX, -entityY, -entityZ);
    GL11.glRotatef(yaw, 0, 1, 0);
    GL11.glRotatef(-pitch, 1, 0, 0);
    part.render(renderer);
    GL11.glPopMatrix();
  }
}

function renderCurveRadius(
  startMarker,
  endMarker,
  midPos,
  entityX,
  entityY,
  entityZ,
  addY
) {
  if (addY === undefined) addY = 0;
  var bezier = getBezierFromMarkers(startMarker, endMarker);
  if (midPos && midPos.isSnap) {
    //真ん中にカーブ半径
    var pos = bezier.getPoint(2, 1);
    var curveRadius = getCurveData3p(
      startMarker.posX,
      startMarker.posY,
      startMarker.posZ,
      endMarker.posX,
      endMarker.posY,
      endMarker.posZ,
      midPos.x,
      midPos.y,
      midPos.z
    ).radius;
    renderRadiusPanel(
      curveRadius,
      pos[0],
      pos[1],
      pos[2],
      entityX,
      entityY,
      entityZ
    );
  } else {
    //各マーカーにカーブ半径
    var length = bezier.getLength();
    var split = Math.floor(length * 2);
    var halfSplit = Math.floor(split / 2);
    var quarterSplit = Math.floor(split / 4);
    var getRadius = function (idx1, idx2) {
      var curveAngle = relativeYaw(
        bezier.getYaw(split, idx2),
        bezier.getYaw(split, idx1)
      );
      var pos1 = bezier.getPoint(split, idx1);
      var pos2 = bezier.getPoint(split, idx2);
      var vec = new Vec3(
        pos2[0] - pos1[0],
        pos2[1] - pos1[1],
        pos2[2] - pos1[2]
      );
      return Math.round(vec.length() / 2 / NGTMath.sin(curveAngle / 2));
    };
    var startRadius = getRadius(0, halfSplit);
    var endRadius = getRadius(halfSplit, split - 1);
    if (startRadius === endRadius) {
      //1枚描画
      var centerPos = bezier.getPoint(split, halfSplit);
      renderRadiusPanel(
        startRadius,
        centerPos[0],
        centerPos[1],
        centerPos[2],
        entityX,
        entityY,
        entityZ
      );
    } else {
      //2枚描画
      var startPos = bezier.getPoint(split, quarterSplit);
      var endPos = bezier.getPoint(split, halfSplit + quarterSplit);
      GL11.glPushMatrix();
      GL11.glTranslatef(0, addY, 0);
      renderRadiusPanel(
        startRadius,
        startPos[0],
        startPos[1],
        startPos[2],
        entityX,
        entityY,
        entityZ
      );
      renderRadiusPanel(
        endRadius,
        endPos[0],
        endPos[1],
        endPos[2],
        entityX,
        entityY,
        entityZ
      );
      GL11.glPopMatrix();
    }
  }
}

function renderCurveFromMarker(
  part,
  startMarker,
  endMarker,
  midPos,
  entityX,
  entityY,
  entityZ
) {
  var bezier = getBezierFromMarkers(startMarker, endMarker);
  renderCurve(
    part,
    cantLine,
    bezier,
    -startMarker.cantEdge,
    endMarker.cantEdge,
    entityX,
    entityY,
    entityZ
  );
}

function renderRadiusPanel(
  curveRadius,
  posX,
  posY,
  posZ,
  entityX,
  entityY,
  entityZ
) {
  if (Math.abs(curveRadius) < maxCurveRadius) {
    var toPlayerVec = new Vec3(entityX - posX, entityY - posY, entityZ - posZ);
    var curveRadiusString = Math.floor(Math.abs(curveRadius)).toString();
    GL11.glPushMatrix();
    GL11.glTranslatef(posX, posY, posZ);
    GL11.glTranslatef(-entityX, -entityY, -entityZ);
    GL11.glRotatef(toPlayerVec.getYaw() + 180, 0, 1, 0);
    GL11.glRotatef(toPlayerVec.getPitch(), 1, 0, 0);
    GL11.glTranslatef((curveRadiusString.length - 1) / 2, 0, 0);
    for (var i = 0; i < curveRadiusString.length; i++) {
      var num = Number(curveRadiusString.slice(i, i + 1));
      GL11.glPushMatrix();
      GL11.glTranslatef(-i, 0, 0);
      curvePanel[num].render(renderer);
      if (i === 0) {
        curvePanel_Radius.render(renderer);
        if (curveRadius > 0) curvePanel_R.render(renderer);
        if (curveRadius < 0) curvePanel_L.render(renderer);
      }
      if (i === curveRadiusString.length - 1) curvePanel_m.render(renderer);
      GL11.glPopMatrix();
    }
    GL11.glPopMatrix();
  }
}

//##-----------------##
//##    関数(計算)    ##
//##-----------------##
//最大公約数を求める関数(ユークリッドの互除法)
function getGCD(num1, num2) {
  if (!isFinite(num1) || !isFinite(num2)) {
    return 1;
  }
  var a = Math.floor(Math.abs(num1));
  var b = Math.floor(Math.abs(num2));
  if (b > a) {
    var temp = a;
    a = b;
    b = temp;
  }
  if (b === 0) {
    return a;
  }
  return getGCD(b, a % b);
}

//-180～180に変換
function normalizeYaw(yaw) {
  return ((((yaw + 180) % 360) + 360) % 360) - 180;
}

//相対角度を計算 時計回り:+x 反時計回り:-x
function relativeYaw(yaw, baseYaw) {
  var d1 = (yaw - baseYaw - 360) % 360;
  var d2 = (yaw - baseYaw + 360) % 360;
  return Math.abs(d1) < Math.abs(d2) ? d1 : d2;
}

//距離の2乗を計算
function getDistanceSq(x1, y1, z1, x2, y2, z2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  var dz = z2 - z1;
  return dx * dx + dy * dy + dz * dz;
}

//分岐レールかどうかチェックする
function isSwitchRail(tile) {
  if (tile instanceof TileEntityLargeRailBase) {
    var railMaps = getAllRailMapsFromTile(tile);
    return railMaps.length > 1;
  }
  return false;
}

//レールタイルからすべてのRailMapを取得
function getAllRailMapsFromTile(tile) {
  if (tile instanceof TileEntityLargeRailBase) {
    var core = tile.getRailCore();
    if (core) return core.getAllRailMaps() || [];
  }
  return [];
}

//TileEntityのBlock座標を取得する
function getTileEntityPos(tileEntity) {
  if (isOldVer) {
    return {
      x: tileEntity.field_145851_c,
      y: tileEntity.field_145848_d,
      z: tileEntity.field_145849_e
    };
  } else {
    var blockPos = tileEntity.func_174877_v();
    return {
      x: blockPos.func_177958_n(),
      y: blockPos.func_177956_o(),
      z: blockPos.func_177952_p()
    };
  }
}

//指定座標の周囲にあるtileEntityを取得する
function getAroundTileEntity(world, x, y, z, range) {
  var tileEntityList = [];
  var offset = Math.floor(range / 2);
  for (var xIdx = 0; xIdx < range; xIdx++) {
    for (var zIdx = 0; zIdx < range; zIdx++) {
      for (var yIdx = 0; yIdx < range; yIdx++) {
        var posX = x + xIdx - offset;
        var posY = y + yIdx - offset;
        var posZ = z + zIdx - offset;
        var tile = getTileEntity(world, posX, posY, posZ);
        if (tile) tileEntityList.push(tile);
      }
    }
  }
  return tileEntityList;
}

//指定座標+周囲にあるレールタイルを取得する
function getAroundRailData(world, x, y, z) {
  var tileEntityList = getAroundTileEntity(world, x, y, z, 3);
  for (var i = 0; i < tileEntityList.length; i++) {
    var tile = tileEntityList[i];
    if (
      tile instanceof TileEntityLargeRailBase &&
      tile.getRailCore() !== null
    ) {
      var blockPos = getTileEntityPos(tile);
      var tileCore = tile.getRailCore();
      var nearestRP = null;
      var isRPSnap = false;
      if (isSwitchRail(tile)) {
        //分岐レール
        var points = tileCore.getSwitch().getPoints();
        if (!points) return null;
        var minDistance = railSnapDistance * railSnapDistance;
        for (var j = 0; j < points.length; j++) {
          var rootRP = points[j].rpRoot;
          var distance = getDistanceSq(
            x,
            y,
            z,
            rootRP.posX,
            rootRP.posY,
            rootRP.posZ
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearestRP = rootRP;
            isRPSnap = true;
          }
        }
      } else {
        //直線レール
        if (!tileCore.getRailPositions()) return null;
        var startRP = tileCore.getRailPositions()[0];
        var endRP = tileCore.getRailPositions()[1];
        var startRPDistance = getDistanceSq(
          x,
          y,
          z,
          startRP.posX,
          startRP.posY,
          startRP.posZ
        );
        var endRPDistance = getDistanceSq(
          x,
          y,
          z,
          endRP.posX,
          endRP.posY,
          endRP.posZ
        );
        if (startRPDistance <= railSnapDistance * railSnapDistance) {
          nearestRP = startRP;
          isRPSnap = true;
        } else if (endRPDistance <= railSnapDistance * railSnapDistance) {
          nearestRP = endRP;
          isRPSnap = true;
        }
      }
      return {
        blockX: blockPos.x,
        blockY: blockPos.y,
        blockZ: blockPos.z,
        tile: tile,
        rp: nearestRP,
        isRPSnap: isRPSnap
      };
    }
  }
  return null;
}

//Railmapとカーソル座標から分割可能な座標データを返す
function getSplitPosList(railMap, railPosAccuracy) {
  if (!railMap) return [];
  var railBezier = getBezierFromRailMap(railMap);
  var split = Math.floor(railBezier.getLength() / (railPosAccuracy * 2));
  var posList = [];
  for (var i = 0; i <= split; i++) {
    var pos = railBezier.getPoint(split, i);
    var nearestPos = getNearestEdgePos(pos[0], pos[1], pos[2]);
    var yaw = -railBezier.getYaw(split, i) + 90;
    var pitch = railBezier.getPitch(split, i);
    var rate = i / split;
    var distanceSq = getDistanceSq(
      pos[0],
      pos[1],
      pos[2],
      nearestPos.x,
      nearestPos.y,
      nearestPos.z
    );
    if (distanceSq < railPosAccuracy * railPosAccuracy) {
      posList.push([pos[0], pos[1], pos[2], yaw, pitch, rate]);
    }
  }
  return posList;
}

//座標リストと指定座標から一番近い座標を返す
function getNearestPosFromList(list, x, y, z, distance) {
  var minDistance = distance * distance;
  var minPos = null;
  for (var i = 0; i < list.length; i++) {
    var distanceSq = getDistanceSq(list[i][0], list[i][1], list[i][2], x, y, z);
    if (distanceSq < minDistance) {
      minPos = list[i];
      minDistance = distanceSq;
    }
  }
  return minPos;
}

//RailPositionから接続する座標を取得
function getConnectPos(railPos) {
  return {
    x: Math.floor(
      railPos.blockX +
        0.5 +
        RailPosition.REVISION[Number(railPos.direction)][0] * 2
    ),
    y: railPos.blockY,
    z: Math.floor(
      railPos.blockZ +
        0.5 +
        RailPosition.REVISION[Number(railPos.direction)][1] * 2
    )
  };
}

//正円近似するアンカー交点にスナップする
function getMidPosAtCircle(
  startX,
  startY,
  startZ,
  endX,
  endY,
  endZ,
  selectX,
  selectY,
  selectZ
) {
  var centerPosX = (startX + endX) / 2;
  var centerPosY = (startY + endY) / 2;
  var centerPosZ = (startZ + endZ) / 2;
  var baseVec = new Vec3(
    endX - centerPosX,
    endY - centerPosY,
    endZ - centerPosZ
  ); //中点から終点
  var crossVec = baseVec.rotateAroundY(90); //交差するvec
  var toSelectVec = new Vec3(
    selectX - centerPosX,
    selectY - centerPosY,
    selectZ - centerPosZ
  ); //中点から選択点
  var angle = relativeYaw(toSelectVec.getYaw(), crossVec.getYaw());
  var distance = NGTMath.cos(angle) * toSelectVec.length();
  var toSnapPosVec = crossVec.multi(distance / crossVec.length());
  return {
    x: toSnapPosVec.getX() + centerPosX,
    y: centerPosY,
    z: toSnapPosVec.getZ() + centerPosZ,
    isSnap: true
  };
}

//固定マーカーと終点座標から正円近似するアンカー交点を計算
function getAnchorPosFromCircleFixed1(fixedMarker, endX, endY, endZ) {
  var centerPosX = (fixedMarker.posX + endX) / 2;
  var centerPosY = (fixedMarker.posY + endY) / 2;
  var centerPosZ = (fixedMarker.posZ + endZ) / 2;
  var toCenterVec = new Vec3(
    centerPosX - fixedMarker.posX,
    centerPosY - fixedMarker.posY,
    centerPosZ - fixedMarker.posZ
  ); //始点から中点
  var anchorVec = fixedMarker.anchorVec;
  var angle = relativeYaw(anchorVec.getYaw(), toCenterVec.getYaw());
  var distance = toCenterVec.length() / NGTMath.cos(angle);
  var midPosVec = anchorVec.multi(distance / anchorVec.length());
  return {
    x: midPosVec.getX() + fixedMarker.posX,
    y: midPosVec.getY() + fixedMarker.posY,
    z: midPosVec.getZ() + fixedMarker.posZ,
    isSnap: true
  };
}

//始点、終点、アンカー交点から正円のカーブ半径と角度を計算
//※直線のときは { radius:Infinity, angle:0 }を取ります
function getCurveData3p(
  startX,
  startY,
  startZ,
  endX,
  endY,
  endZ,
  midPosX,
  midPosY,
  midPosZ
) {
  var toEndVec = new Vec3(endX - startX, endY - startY, endZ - startZ);
  var toMidVec = new Vec3(midPosX - startX, midPosY - startY, midPosZ - startZ);
  var curveAngle = relativeYaw(toMidVec.getYaw(), toEndVec.getYaw()) * 2;
  var curveRadius = toEndVec.length() / 2 / NGTMath.sin(curveAngle / 2);
  return { radius: curveRadius, angle: curveAngle };
}

//2点の座標(x,z)とアンカー角度(yaw)から平均のカーブ半径と角度を計算
//※直線のときは { radius:Infinity, angle:0 }を取ります
function getCurveData2p(
  startX,
  startY,
  startZ,
  startYaw,
  endX,
  endY,
  endZ,
  endYaw
) {
  var intersection = getCrossPos(
    startX,
    startY,
    startZ,
    startYaw,
    endX,
    endY,
    endZ,
    endYaw
  );
  return getCurveData3p(
    startX,
    startY,
    startZ,
    endX,
    endY,
    endZ,
    intersection.getX(),
    intersection.getY(),
    intersection.getZ()
  );
}

//2点の座標(x,z)とアンカー角度(yaw)から交点を計算
function getCrossPos(
  startX,
  startY,
  startZ,
  startYaw,
  endX,
  endY,
  endZ,
  endYaw
) {
  var startPosVec = new Vec3(startX, startY, startZ);
  var endPosVec = new Vec3(endX, endY, endZ);
  var dirVec1 = new Vec3(NGTMath.sin(startYaw), 0, NGTMath.cos(startYaw));
  var dirVec2 = new Vec3(NGTMath.sin(endYaw), 0, NGTMath.cos(endYaw));
  var toEndVec = endPosVec.sub(startPosVec);
  var surfaceArea =
    dirVec1.getX() * dirVec2.getZ() - dirVec1.getZ() * dirVec2.getX();
  if (Math.abs(surfaceArea) < 0.00001) {
    //面積が十分に0に近いとき、2つのベクトルは平行である
    return startPosVec.add(endPosVec).multi(0.5);
  }
  var t1 =
    (toEndVec.getX() * dirVec2.getZ() - toEndVec.getZ() * dirVec2.getX()) /
    surfaceArea;
  return startPosVec.add(dirVec1.multi(t1));
}

//カーブ半径と中心角から正円近似カーブのアンカーの長さを計算
//※微小角のときはnullを返す
function getAnchorLengthFromCircle(radius, angle) {
  if (Math.abs(radius) > maxCurveRadius || Math.abs(angle) < 1.0) return null;
  return radius * (4 / 3) * Math.tan(NGTMath.toRadians(angle) / 4);
}

//座標、yaw、カーブ半径、弧長からカーブの終端座標を計算
function continueCurveEndPos(x, y, z, yaw, curveRadius, curveLength) {
  if (curveRadius > maxCurveRadius) {
    var straightVec = new Vec3(0, 0, curveLength);
    straightVec = straightVec.rotateAroundY(yaw);
    return {
      x: x + straightVec.getX(),
      y: y,
      z: z + straightVec.getZ()
    };
  } else {
    var curveRadiusVec = new Vec3(curveRadius, 0, 0);
    var curveAngle = NGTMath.toDegrees(curveLength / curveRadius);
    var curveEndVec1 = curveRadiusVec.rotateAroundY(yaw);
    var curveEndVec2 = curveEndVec1.rotateAroundY(-curveAngle);
    var toEndVec = curveEndVec2.sub(curveEndVec1);
    return {
      x: x + toEndVec.getX(),
      y: y,
      z: z + toEndVec.getZ()
    };
  }
}

//2つの固定マーカーからアンカーの長さを計算
function getAnchorLengthFixed2(startMarker, endMarker) {
  var directVec = new Vec3(
    endMarker.posX - startMarker.posX,
    endMarker.posY - startMarker.posY,
    endMarker.posZ - startMarker.posZ
  );
  var startAnchorVec = startMarker.anchorVec.multi(
    1 / startMarker.anchorVec.length()
  );
  var endAnchorVec = endMarker.anchorVec.multi(
    1 / endMarker.anchorVec.length()
  );
  startAnchorVec = startAnchorVec.multi(directVec.length() * (2 / 3));
  endAnchorVec = endAnchorVec.multi(directVec.length() * (2 / 3));
  var sp = [startMarker.posX, startMarker.posY, startMarker.posZ];
  var ep = [endMarker.posX, endMarker.posY, endMarker.posZ];
  var scp = [
    sp[0] + startAnchorVec.getX(),
    sp[1] + startAnchorVec.getY(),
    sp[2] + startAnchorVec.getZ()
  ];
  var ecp = [
    ep[0] + endAnchorVec.getX(),
    ep[1] + endAnchorVec.getY(),
    ep[2] + endAnchorVec.getZ()
  ];
  var bezier = new BezierCurve3D(sp, scp, ecp, ep);
  return bezier.getLength() / 3;
}

//2つの非固定マーカーから2点を結ぶ直線のアンカーの長さを計算
function getAnchorLengthFromDirectMarker(startMarker, endMarker) {
  return getAnchorLength(
    startMarker.posX,
    startMarker.posY,
    startMarker.posZ,
    endMarker.posX,
    endMarker.posY,
    endMarker.posZ
  );
}

//x, y, zから一番近いRailPositionとそれに付帯するRailMapを返す
function getNearestRPAndRM(world, tile, x, y, z) {
  var tileCore = tile.getRailCore();
  var railMapList = getAllRailMapsFromTile(tileCore);
  var railPosition = null;
  var railMap = null;
  if (railMapList.length > 1) {
    //分岐レール
    var minDistance = Infinity;
    var points = tileCore.getSwitch().getPoints();
    var nearestPoint = null;
    for (var i = 0; i < points.length; i++) {
      var rootRP = points[i].rpRoot;
      var distance = getDistanceSq(
        x,
        y,
        z,
        rootRP.posX,
        rootRP.posY,
        rootRP.posZ
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = points[i];
      }
    }
    railPosition = nearestPoint.rpRoot;
    railMap = nearestPoint.getActiveRailMap(world);
  } else if (railMapList.length === 1) {
    //直線レール
    var rps = tileCore.getRailPositions();
    var rp0Distance = getDistanceSq(
      rps[0].posX,
      rps[0].posY,
      rps[0].posZ,
      x,
      y,
      z
    );
    var rp1Distance = getDistanceSq(
      rps[1].posX,
      rps[1].posY,
      rps[1].posZ,
      x,
      y,
      z
    );
    railPosition = rp0Distance < rp1Distance ? rps[0] : rps[1];
    railMap = railMapList[0];
  }
  return {
    railPosition: railPosition,
    railMap: railMap
  };
}

//2点を結ぶ直線のアンカーの長さを計算
function getAnchorLength(x1, y1, z1, x2, y2, z2) {
  var midPosX = (x1 + x2) / 2;
  var midPosY = (y1 + y2) / 2;
  var midPosZ = (z1 + z2) / 2;
  var startVec = new Vec3(midPosX - x1, midPosY - y1, midPosZ - z1);
  return (startVec.length() * 2) / 3;
}

//視線の座標を取得
function getLookingPos() {
  var pos = null;
  var player = MCWrapperClient.getPlayer();
  var mop = BlockUtil.getMOPFromPlayer(player, cursorMaxDistance, true);
  if (mop) {
    var lookingVec = mop.field_72307_f;
    var nearestPos = getNearestEdgePos(
      lookingVec.field_72450_a,
      lookingVec.field_72448_b,
      lookingVec.field_72449_c
    );
    if (isOldVer) {
      pos = {
        posX: lookingVec.field_72450_a,
        posY: lookingVec.field_72448_b,
        posZ: lookingVec.field_72449_c,
        blockX: mop.field_72311_b,
        blockY: mop.field_72312_c,
        blockZ: mop.field_72309_d,
        snapX: nearestPos.x,
        snapY: mop.field_72312_c,
        snapZ: nearestPos.z
      };
    } else {
      var blockPos = mop.func_178782_a();
      pos = {
        posX: lookingVec.field_72450_a,
        posY: lookingVec.field_72448_b,
        posZ: lookingVec.field_72449_c,
        blockX: blockPos.func_177958_n(),
        blockY: blockPos.func_177956_o(),
        blockZ: blockPos.func_177952_p(),
        snapX: nearestPos.x,
        snapY: blockPos.func_177956_o(),
        snapZ: nearestPos.z
      };
    }
  }
  return pos;
}

//指定座標から、一番近いマーカー起点(ブロックの縁)の座標を計算
function getNearestEdgePos(x, y, z) {
  var minPos = null;
  var minDistance = Infinity;
  for (var i = 0; i < RailPosition.REVISION.length; i++) {
    var posX = Math.floor(x) + 0.5 + RailPosition.REVISION[i][0];
    var posY = Math.round(y * 16) / 16;
    var posZ = Math.floor(z) + 0.5 + RailPosition.REVISION[i][1];
    var distance = getDistanceSq(posX, posY, posZ, x, y, z);
    if (distance < minDistance) {
      minPos = { x: posX, y: posY, z: posZ };
      minDistance = distance;
    }
  }
  return minPos;
}

//指定座標から近い方のマーカーを返す
function getNearestMarker(marker1, marker2, x, y, z) {
  var marker1Pos = marker1.getPos();
  var marker2Pos = marker2.getPos();
  var marker1Distance = getDistanceSq(
    marker1Pos.x,
    marker1Pos.y,
    marker1Pos.z,
    x,
    y,
    z
  );
  var marker2Distance = getDistanceSq(
    marker2Pos.x,
    marker2Pos.y,
    marker2Pos.z,
    x,
    y,
    z
  );
  if (marker1Distance < marker2Distance) return marker1;
  return marker2;
}

//2つのマーカーからベジェ曲線を取得
function getBezierFromMarkers(startMarker, endMarker) {
  return getBezier(
    startMarker.posX,
    startMarker.posY,
    startMarker.posZ,
    startMarker.anchorVec,
    endMarker.posX,
    endMarker.posY,
    endMarker.posZ,
    endMarker.anchorVec
  );
}

//RailMapからベジェ曲線を取得
function getBezierFromRailMap(railMap) {
  var startRP = railMap.getStartRP();
  var endRP = railMap.getEndRP();
  //pitch
  var straightPitch = new Vec3(
    endRP.posX - startRP.posX,
    endRP.posY - startRP.posY,
    endRP.posZ - startRP.posZ
  ).getPitch();
  var startAnchorPitch =
    isKaizPatch || !isOldVer ? startRP.anchorPitch : straightPitch;
  var endAnchorPitch =
    isKaizPatch || !isOldVer ? endRP.anchorPitch : straightPitch;
  if (
    startAnchorPitch === 0 &&
    endAnchorPitch === 0 &&
    startRP.posY !== endRP.posY &&
    (isKaizPatch || !isOldVer) &&
    railMap
  ) {
    //縦曲線未設定による代替処理
    var split = Math.floor(railMap.getLength() * 2);
    startAnchorPitch = railMap.getRailPitch(split, 0);
    endAnchorPitch = -startAnchorPitch;
  }
  //yaw
  var startAnchorYaw =
    isKaizPatch || !isOldVer ? startRP.anchorYaw : startRP.anchorDirection;
  var endAnchorYaw =
    isKaizPatch || !isOldVer ? endRP.anchorYaw : endRP.anchorDirection;
  //length
  var startAnchorLength =
    isKaizPatch || !isOldVer
      ? startRP.anchorLengthHorizontal
      : startRP.anchorLength;
  var endAnchorLength =
    isKaizPatch || !isOldVer
      ? endRP.anchorLengthHorizontal
      : endRP.anchorLength;
  //vec
  var startAnchorVec = new Vec3(0, 0, startAnchorLength)
    .rotateAroundX(startAnchorPitch)
    .rotateAroundY(normalizeYaw(startAnchorYaw));
  var endAnchorVec = new Vec3(0, 0, endAnchorLength)
    .rotateAroundX(endAnchorPitch)
    .rotateAroundY(normalizeYaw(endAnchorYaw));
  return getBezier(
    startRP.posX,
    startRP.posY,
    startRP.posZ,
    startAnchorVec,
    endRP.posX,
    endRP.posY,
    endRP.posZ,
    endAnchorVec
  );
}

//2つのx, y, z, vecからベジェ曲線を取得
function getBezier(x1, y1, z1, vec1, x2, y2, z2, vec2) {
  var sp = [x1, y1, z1];
  var ep = [x2, y2, z2];
  var scp = [sp[0] + vec1.getX(), sp[1] + vec1.getY(), sp[2] + vec1.getZ()];
  var ecp = [ep[0] + vec2.getX(), ep[1] + vec2.getY(), ep[2] + vec2.getZ()];
  return new BezierCurve3D(sp, scp, ecp, ep);
}

//デバッグ中  カーブレールに接続する(始点終点入れ替えする)とアンカーの角度がおかしい
//1点固定から疑似緩和曲線に変換したマーカーを返す
//参考 三次放物線 https://sites.google.com/view/senmitsu/%E6%B8%AC%E9%87%8F%E7%B3%BB/10-3-%E7%B7%A9%E5%92%8C%E6%9B%B2%E7%B7%9A
function createTransitionCurveBezier(startMarker, endMarker, world) {
  var checker = new CheckType(startMarker, endMarker);
  if (
    checker.check(SelectType.connectRail, SelectType.block) ||
    checker.check(SelectType.connectRail, SelectType.pos)
  ) {
    var isCurvedRail = false;
    var targetRadius = Infinity;
    //接続しているレールのカーブ半径を調べる
    var connectPos = startMarker.getConnectPos();
    var connectRailTile = getTileEntity(
      world,
      connectPos.x,
      connectPos.y,
      connectPos.z
    );
    if (
      connectRailTile &&
      connectRailTile instanceof TileEntityLargeRailBase &&
      getAllRailMapsFromTile(connectRailTile)
    ) {
      var connectRPs = connectRailTile.getRailCore().getRailPositions();
      var connectStartRP = connectRPs[0];
      var connectStartYaw =
        isKaizPatch || !isOldVer
          ? connectStartRP.anchorYaw
          : connectStartRP.anchorDirection;
      var connectEndRP = connectRPs[1];
      var connectEndYaw =
        isKaizPatch || !isOldVer
          ? connectEndRP.anchorYaw
          : connectEndRP.anchorDirection;
      var connectCurveData = getCurveData2p(
        connectStartRP.posX,
        connectStartRP.posY,
        connectStartRP.posZ,
        connectStartYaw,
        connectEndRP.posX,
        connectEndRP.posY,
        connectEndRP.posZ,
        connectEndYaw
      );
      var radius = connectCurveData.radius;
      var hasCoreTile =
        connectPos.x === connectStartRP.blockX &&
        connectPos.y === connectStartRP.blockY &&
        connectPos.z === connectStartRP.blockZ;
      if (radius !== Infinity) {
        //接続する線路がカーブしている
        //タイルが接続側にある→逆順
        targetRadius = hasCoreTile ? radius * 2 : -radius * 2;
        isCurvedRail = true;
      }
    }

    //直線側/曲線側を決める
    var enterSideMarker = isCurvedRail ? endMarker : startMarker; //直線側
    var exitSideMarker = isCurvedRail ? startMarker : endMarker; //曲線側

    //Xを求める
    var enterSideAnchorVec = enterSideMarker.anchorVec;
    var rotateOffset = enterSideAnchorVec.getYaw() - 90;
    var toEndVec = new Vec3(
      exitSideMarker.posX - enterSideMarker.posX,
      exitSideMarker.posY - enterSideMarker.posY,
      exitSideMarker.posZ - enterSideMarker.posZ
    );
    toEndVec = toEndVec.rotateAroundY(-rotateOffset);
    var curveX = toEndVec.getX();

    //Rを求める(接続側がカーブの場合はその曲線半径を使う)
    if (!isCurvedRail) {
      var midPos = getAnchorPosFromCircleFixed1(
        enterSideMarker,
        exitSideMarker.posX,
        exitSideMarker.posY,
        exitSideMarker.posZ
      );
      var curveData = getCurveData3p(
        enterSideMarker.posX,
        enterSideMarker.posY,
        enterSideMarker.posZ,
        exitSideMarker.posX,
        exitSideMarker.posY,
        exitSideMarker.posZ,
        midPos.x,
        midPos.y,
        midPos.z
      );
      targetRadius = curveData.radius;
    }

    //3次元曲線を用いた緩和曲線の点群を作成する
    //pointsは原点から点までのベクトル(回転に対応するため)
    var points = [];
    var split = Math.floor(curveX * 2);
    for (var i = 0; i < split; i++) {
      var x = i * (curveX / split);
      var y = (x * x * x) / (6 * targetRadius * curveX);
      points.push(new Vec3(x, 0, y));
    }
    var lastIdx = points.length - 2; //pos[points.length - 1] = pos[split]はデータが不正なため

    if (points.length < 3) return null;

    //点群を回転する(始点/終点を入れ替える場合)
    if (isCurvedRail) {
      //pointsの順番を反転(xだけそのまま)
      var shiftZ = points[points.length - 1].getZ(); //反転後の原点との差
      for (var i = 0; i < Math.floor(points.length / 2); i++) {
        //前後同時に入れ替えしていくので半分だけ
        var j = points.length - 1 - i;
        var zi = points[i].getZ();
        var zj = points[j].getZ();
        points[i] = new Vec3(points[i].getX(), points[i].getY(), zj - shiftZ);
        points[j] = new Vec3(points[j].getX(), points[j].getY(), zi - shiftZ);
      }
      if (points.length % 2 === 1) {
        var mid = Math.floor(points.length / 2);
        points[mid] = new Vec3(
          points[mid].getX(),
          points[mid].getY(),
          points[mid].getZ() - shiftZ
        );
      }
      //起点の角度を取得
      var enterPointVec = new Vec3(
        points[1].getX() - points[0].getX(),
        0,
        points[1].getZ() - points[0].getZ()
      );
      var rotationAngle = enterPointVec.getYaw() - 90; //Vec3はMinecraft座標系に基づいているため、数学座標系に変換するため-90をする
      //点群を原点を中心に回転
      for (var i = 0; i < points.length; i++) {
        points[i] = points[i].rotateAroundY(rotationAngle);
      }
    }

    //固定/非固定を確定させる
    var fixedMarker =
      startMarker.selectType === SelectType.connectRail
        ? startMarker
        : endMarker;
    var unfixedMarker =
      startMarker.selectType === SelectType.connectRail
        ? endMarker
        : startMarker;

    //新しい始点
    var startVec = fixedMarker.anchorVec;
    var startPos = [fixedMarker.posX, fixedMarker.posY, fixedMarker.posZ];

    //新しい終点    //実はtoEndVec2が間違ってる説
    var fixedMarkerAnchorVec = fixedMarker.anchorVec;
    var anchorLength = fixedMarkerAnchorVec.length();
    var rotateOffset = fixedMarkerAnchorVec.getYaw() - 90;
    var toEndVec2 = new Vec3(
      points[lastIdx].getX(),
      unfixedMarker.posY - fixedMarker.posY,
      points[lastIdx].getZ()
    );
    toEndVec2 = toEndVec2.rotateAroundY(rotateOffset);
    var endVec = new Vec3(
      points[lastIdx - 1].getX() - points[lastIdx].getX(),
      0,
      points[lastIdx - 1].getZ() - points[lastIdx].getZ()
    );
    endVec = endVec.rotateAroundY(rotateOffset);
    endVec = endVec.multi((1 / endVec.length()) * anchorLength);
    var endPos = [
      startPos[0] + toEndVec2.getX(),
      startPos[1] + toEndVec2.getY(),
      startPos[2] + toEndVec2.getZ()
    ];

    //ダミーのエンド側アンカー
    var dummyEndMarker = unfixedMarker.copy();
    dummyEndMarker.anchorVec = endVec;
    dummyEndMarker.posX = endPos[0];
    dummyEndMarker.posY = endPos[1];
    dummyEndMarker.posZ = endPos[2];

    //疑似緩和ベジェ曲線
    return {
      bezier: getBezier(
        startPos[0],
        startPos[1],
        startPos[2],
        startVec,
        endPos[0],
        endPos[1],
        endPos[2],
        endVec
      ),
      endMarker: dummyEndMarker,
      radius: targetRadius,
      length: curveX
    };
  }
  return null;
}

//##---------------------------##
//##    擬似クラス: マーカー    ##
//##---------------------------##

var SelectType = {
  block: "block",
  pos: "pos",
  connectRail: "connectRail",
  switch: "switch",
  fixed: "fixed"
};

var MarkerDirection = {
  directionList: [0, 45, 90, 135, -180, -135, -90, -45],
  getDirFromYaw: function (yaw) {
    if (yaw === null) return null;
    for (var index = 0; index < this.directionList.length; index++) {
      var baseYaw = this.directionList[index];
      var yawDiff = relativeYaw(yaw, baseYaw);
      if (-22.5 < yawDiff && yawDiff <= 22.5) return index;
    }
    return null;
  },
  getDirFromPos: function (blockX, blockZ, posX, posZ) {
    var dirVec = new Vec3(blockX + 0.5 - posX, 0, blockZ + 0.5 - posZ);
    return this.getDirFromYaw(dirVec.getYaw());
  },
  getDirFromSnapPos: function (posX, posZ, yaw) {
    posX = Math.round(posX * 10) / 10;
    posZ = Math.round(posZ * 10) / 10;
    var isPosXMiddle = Math.abs(posX % 1) === 0.5;
    var isPosZMiddle = Math.abs(posZ % 1) === 0.5;
    var yawList = [];
    //コーナー
    if (!isPosXMiddle && !isPosZMiddle) yawList = [45, 135, -135, -45];
    //Z辺
    else if (isPosZMiddle) yawList = [90, -90];
    //X辺
    else if (isPosXMiddle) yawList = [0, 180];
    var minYaw = null;
    var minYawDiff = Infinity;
    for (var i = 0; i < yawList.length; i++) {
      var yawDiff = Math.abs(relativeYaw(yaw, yawList[i]));
      if (yawDiff < minYawDiff) {
        minYawDiff = yawDiff;
        minYaw = yawList[i];
      }
    }
    return this.getDirFromYaw(minYaw);
  }
};

//※cantGuageにはrailGuageListから選んだオブジェクトをそのまま渡す(railGuage.guageではない)
var Marker = function (
  selectType,
  x,
  y,
  z,
  dir,
  railHeight,
  cantHeight,
  cantGuage,
  fixedYaw,
  fixedPitch,
  fixedAnchorVec
) {
  if (fixedAnchorVec !== undefined) {
    fixedYaw = fixedAnchorVec.getYaw();
    fixedPitch = fixedAnchorVec.getPitch();
  }

  //基幹
  this.blockX = null;
  this.blockY = null;
  this.blockZ = null;
  this.dir = dir;
  this.anchorVec = null;
  this.cantEdge = null;
  this.cantCenter = null;
  this.railHeight = railHeight;
  this.switchType = SwitchType.normal;

  //拡張
  this.posX = null;
  this.posY = null;
  this.posZ = null;
  this.cantHeight = cantHeight;
  this.cantGuage = cantGuage;
  this.cantAngle = NGTMath.toDegrees(Math.asin(cantHeight / cantGuage.guage));
  this.selectType = selectType;
  this.isInitiarized = false;
  this.isFixedVec = false;
  this.id =
    x +
    ":" +
    y +
    ":" +
    z +
    ":" +
    dir +
    ":" +
    railHeight +
    ":" +
    fixedYaw +
    ":" +
    fixedPitch +
    ":";

  var revision = dir !== null ? RailPosition.REVISION[dir] : null;

  //タイプ別コンストラクタ
  if (selectType === SelectType.block) {
    this.blockX = x;
    this.blockY = y;
    this.blockZ = z;
    this.posY = y + this.railHeight / 16;
  }

  if (selectType === SelectType.pos) {
    this.blockX = x;
    this.blockY = y;
    this.blockZ = z;
    this.posX = x + 0.5 + revision[0];
    this.posY = y + this.railHeight / 16;
    this.posZ = z + 0.5 + revision[1];
    this.isInitiarized = true;
  }

  if (selectType === SelectType.connectRail) {
    this.anchorVec = new Vec3(0, 0, 1);
    this.blockX = x;
    this.blockY = y;
    this.blockZ = z;
    this.posX = x + 0.5 + revision[0];
    this.posY = y + this.railHeight / 16;
    this.posZ = z + 0.5 + revision[1];
    this.anchorVec = this.anchorVec.rotateAroundX(fixedPitch);
    this.anchorVec = this.anchorVec.rotateAroundY(fixedYaw);
    this.isInitiarized = true;
    this.isFixedVec = true;
  }

  if (selectType === SelectType.switch) {
    this.anchorVec = fixedAnchorVec;
    this.blockX = x;
    this.blockY = y;
    this.blockZ = z;
    this.posX = x + 0.5 + revision[0];
    this.posY = y + this.railHeight / 16;
    this.posZ = z + 0.5 + revision[1];
    this.switchType = SwitchType.switch;
    this.isInitiarized = true;
    this.isFixedVec = true;
  }

  if (selectType === SelectType.fixed) {
    this.anchorVec = fixedAnchorVec;
    this.blockX = x;
    this.blockY = y;
    this.blockZ = z;
    this.posX = x + 0.5 + revision[0];
    this.posY = y + this.railHeight / 16;
    this.posZ = z + 0.5 + revision[1];
    this.isInitiarized = true;
    this.isFixedVec = true;
  }
};
Marker.prototype = {
  initialize: function (endMarker) {
    if (!this.isInitiarized && this.selectType === SelectType.block) {
      this.isInitiarized = true;
      var endPos = endMarker.getPos();
      var toEndVec = new Vec3(
        endPos.x - this.blockX,
        endPos.y - this.blockY,
        endPos.z - this.blockZ
      );
      this.dir = MarkerDirection.getDirFromYaw(toEndVec.getYaw());
      this.posX =
        this.blockX + 0.5 + RailPosition.REVISION[Number(this.dir)][0];
      this.posZ =
        this.blockZ + 0.5 + RailPosition.REVISION[Number(this.dir)][1];
    }
  },

  uninitialize: function () {
    if (this.isInitiarized && this.selectType === SelectType.block) {
      this.isInitiarized = false;
      this.dir = null;
      this.posX = null;
      this.posZ = null;
    }
  },

  createRPData: function () {
    return {
      blockX: this.blockX,
      blockY: this.blockY,
      blockZ: this.blockZ,
      markerDir: this.dir,
      height: this.railHeight,
      cantEdge: this.cantEdge,
      cantCenter: this.cantCenter,
      switchType: this.switchType,
      anchorYaw: this.anchorVec.getYaw(),
      anchorPitch: this.anchorVec.getPitch(),
      anchorLength: this.anchorVec.length()
    };
  },

  copy: function (railHeight) {
    var posY = this.posY;
    if (railHeight === undefined) {
      railHeight = this.railHeight;
    } else {
      posY = this.blockY + railHeight / 16;
    }
    var fixedYaw = this.isFixedVec ? this.anchorVec.getYaw() : null;
    var fixedPitch = this.isFixedVec ? this.anchorVec.getPitch() : null;
    var newAnchorVec = this.isFixedVec
      ? new Vec3(
          this.anchorVec.getX(),
          this.anchorVec.getY(),
          this.anchorVec.getZ()
        )
      : null;
    var newMarker = new Marker(
      this.selectType,
      0,
      0,
      0,
      this.dir,
      railHeight,
      this.cantHeight,
      this.cantGuage,
      fixedYaw,
      fixedPitch
    );
    //var newMarker = new Marker(this.selectType, 0, 0, 0, this.dir, this.railHeight, this.cantHeight, this.cantGuage, fixedYaw, fixedPitch);
    newMarker.blockX = Number(this.blockX);
    newMarker.blockY = Number(this.blockY);
    newMarker.blockZ = Number(this.blockZ);
    newMarker.cantEdge = this.cantEdge;
    newMarker.switchType = this.switchType;
    newMarker.posX = this.posX;
    newMarker.posY = posY;
    newMarker.posZ = this.posZ;
    newMarker.isInitiarized = this.isInitiarized;
    newMarker.isFixedVec = this.isFixedVec;
    newMarker.anchorVec = newAnchorVec;
    return newMarker;
  },

  getPos: function () {
    if (this.isInitiarized) return { x: this.posX, y: this.posY, z: this.posZ };
    else return { x: this.blockX, y: this.blockY, z: this.blockZ };
  },

  getConnectPos: function () {
    if (this.dir === null) return null;
    return {
      x: Math.floor(
        this.blockX + 0.5 + RailPosition.REVISION[Number(this.dir)][0] * 2
      ),
      y: this.blockY,
      z: Math.floor(
        this.blockZ + 0.5 + RailPosition.REVISION[Number(this.dir)][1] * 2
      )
    };
  },

  fixPositionFromYaw: function (yaw) {
    if (isNaN(yaw)) yaw = 0;
    if (this.selectType === SelectType.block) {
      this.dir = MarkerDirection.getDirFromYaw(yaw);
      var revision = RailPosition.REVISION[Number(this.dir)];
      this.posX = this.blockX + 0.5 + revision[0];
      this.posZ = this.blockZ + 0.5 + revision[1];
    }
  },

  resetCant: function () {
    this.cantHeight = 0;
    this.cantAngle = 0;
    this.cantEdge = 0;
    this.cantCenter = 0;
  },

  syncCant: function (endMarker, midPos) {
    var curveRadius = null;
    if (midPos) {
      curveRadius = getCurveData3p(
        this.posX,
        this.posY,
        this.posZ,
        endMarker.posX,
        endMarker.posY,
        endMarker.posZ,
        midPos.x,
        midPos.y,
        midPos.z
      ).radius;
    } else {
      curveRadius = getCurveData2p(
        this.posX,
        this.posY,
        this.posZ,
        this.anchorVec.getYaw(),
        endMarker.posX,
        endMarker.posY,
        endMarker.posZ,
        endMarker.anchorVec.getYaw()
      ).radius;
    }
    if (Math.abs(curveRadius) < maxCurveRadius) {
      if (curveRadius > 0) {
        this.cantEdge = this.cantAngle;
        endMarker.cantEdge = -endMarker.cantAngle;
      } else if (curveRadius < 0) {
        this.cantEdge = -this.cantAngle;
        endMarker.cantEdge = endMarker.cantAngle;
      } else {
        this.cantEdge = 0;
        endMarker.cantEdge = 0;
      }
    } else {
      this.cantEdge = 0;
      endMarker.cantEdge = 0;
    }
    this.cantCenter = (this.cantEdge - endMarker.cantEdge) / 2;
    endMarker.cantCenter = this.cantCenter;
  },

  //anchorVecを確定させる
  setMarker: function (endMarker, midPos) {
    //midPos = {x, y, z, isSnap}
    if (!this.isInitiarized) this.initialize(endMarker);
    if (!endMarker.isInitiarized) endMarker.initialize(this);
    var checker = new CheckType(this, endMarker);

    //自由点同士　block→block / block→pos / pos→block / pos→pos
    if (
      checker.checkSet(SelectType.block, SelectType.block) ||
      checker.checkSet(SelectType.block, SelectType.pos) ||
      checker.checkSet(SelectType.pos, SelectType.pos)
    ) {
      if (!midPos) {
        //2点直線
        midPos = {
          x: (this.posX + endMarker.posX) / 2,
          y: (this.posY + endMarker.posY) / 2,
          z: (this.posZ + endMarker.posZ) / 2,
          isSnap: true
        };
        var anchorLength = getAnchorLengthFromDirectMarker(this, endMarker);
        this.anchorVec = new Vec3(
          midPos.x - this.posX,
          midPos.y - this.posY,
          midPos.z - this.posZ
        );
        this.anchorVec = this.anchorVec.multi(
          anchorLength / this.anchorVec.length()
        );
        endMarker.anchorVec = new Vec3(
          midPos.x - endMarker.posX,
          midPos.y - endMarker.posY,
          midPos.z - endMarker.posZ
        );
        endMarker.anchorVec = endMarker.anchorVec.multi(
          anchorLength / endMarker.anchorVec.length()
        );
      } else if (midPos.isSnap) {
        //3点正円近似曲線
        var curveData = getCurveData3p(
          this.posX,
          this.posY,
          this.posZ,
          endMarker.posX,
          endMarker.posY,
          endMarker.posZ,
          midPos.x,
          midPos.y,
          midPos.z
        );
        var anchorLength = getAnchorLengthFromCircle(
          curveData.radius,
          curveData.angle
        );
        if (anchorLength === null)
          anchorLength = getAnchorLengthFromDirectMarker(this, endMarker); //微小角は直線に近似
        this.anchorVec = new Vec3(
          midPos.x - this.posX,
          midPos.y - this.posY,
          midPos.z - this.posZ
        );
        this.anchorVec = this.anchorVec.multi(
          anchorLength / this.anchorVec.length()
        );
        endMarker.anchorVec = new Vec3(
          midPos.x - endMarker.posX,
          midPos.y - endMarker.posY,
          midPos.z - endMarker.posZ
        );
        endMarker.anchorVec = endMarker.anchorVec.multi(
          anchorLength / endMarker.anchorVec.length()
        );
      } else {
        //3点自由曲線
        this.anchorVec = new Vec3(
          midPos.x - this.posX,
          midPos.y - this.posY,
          midPos.z - this.posZ
        );
        this.anchorVec = this.anchorVec.multi(2 / 3);
        endMarker.anchorVec = new Vec3(
          midPos.x - endMarker.posX,
          midPos.y - endMarker.posY,
          midPos.z - endMarker.posZ
        );
        endMarker.anchorVec = endMarker.anchorVec.multi(2 / 3);
      }
    }

    //1点固定　connectRail→block / block→connectRail / connectRail→pos / pos→connectRail
    //        switch→block / block→switch / switch→pos / pos→switch
    //        fixed→block / fixed→switch / fixed→pos / fixed→switch
    if (
      checker.checkSet(SelectType.connectRail, SelectType.block) ||
      checker.checkSet(SelectType.connectRail, SelectType.pos) ||
      checker.checkSet(SelectType.switch, SelectType.block) ||
      checker.checkSet(SelectType.switch, SelectType.pos) ||
      checker.checkSet(SelectType.fixed, SelectType.block) ||
      checker.checkSet(SelectType.fixed, SelectType.pos)
    ) {
      if (!midPos) {
        //正円近似曲線
        var fixedMarker = this.isFixedVec ? this : endMarker;
        var unfixedMarker = this.isFixedVec ? endMarker : this;
        midPos = getAnchorPosFromCircleFixed1(
          fixedMarker,
          unfixedMarker.posX,
          unfixedMarker.posY,
          unfixedMarker.posZ
        );
        var curveData = getCurveData3p(
          fixedMarker.posX,
          fixedMarker.posY,
          fixedMarker.posZ,
          unfixedMarker.posX,
          unfixedMarker.posY,
          unfixedMarker.posZ,
          midPos.x,
          midPos.y,
          midPos.z
        );
        var anchorLength = getAnchorLengthFromCircle(
          curveData.radius,
          curveData.angle
        );
        if (anchorLength === null)
          anchorLength = getAnchorLengthFromDirectMarker(
            fixedMarker,
            unfixedMarker
          ); //微小角は直線に近似
        fixedMarker.anchorVec = fixedMarker.anchorVec.multi(
          anchorLength / fixedMarker.anchorVec.length()
        );
        unfixedMarker.anchorVec = new Vec3(
          midPos.x - unfixedMarker.posX,
          midPos.y - unfixedMarker.posY,
          midPos.z - unfixedMarker.posZ
        );
        unfixedMarker.anchorVec = unfixedMarker.anchorVec.multi(
          anchorLength / unfixedMarker.anchorVec.length()
        );
        unfixedMarker.fixPositionFromYaw(unfixedMarker.anchorVec.getYaw());
      } else {
        //自由曲線
        var fixedMarker = this.isFixedVec ? this : endMarker;
        var unfixedMarker = this.isFixedVec ? endMarker : this;
        unfixedMarker.anchorVec = new Vec3(
          midPos.x - unfixedMarker.posX,
          midPos.y - unfixedMarker.posY,
          midPos.z - unfixedMarker.posZ
        );
        var anchorLength = getAnchorLengthFixed2(fixedMarker, unfixedMarker);
        fixedMarker.anchorVec = fixedMarker.anchorVec.multi(
          anchorLength / fixedMarker.anchorVec.length()
        );
        unfixedMarker.anchorVec = unfixedMarker.anchorVec.multi(
          anchorLength / unfixedMarker.anchorVec.length()
        );
        unfixedMarker.fixPositionFromYaw(unfixedMarker.anchorVec.getYaw());
      }
    }

    //2点固定　connectRail→connectRail / connectRail→switch / connectRail→fixed
    //        switch→switch / switch→connectRail / switch→fixed
    if (
      checker.checkSet(SelectType.connectRail, SelectType.connectRail) ||
      checker.checkSet(SelectType.connectRail, SelectType.switch) ||
      checker.checkSet(SelectType.connectRail, SelectType.fixed) ||
      checker.checkSet(SelectType.switch, SelectType.switch) ||
      checker.checkSet(SelectType.switch, SelectType.fixed)
    ) {
      var anchorLength = getAnchorLengthFixed2(this, endMarker);
      if (this.selectType !== SelectType.fixed)
        this.anchorVec = this.anchorVec.multi(
          anchorLength / this.anchorVec.length()
        );
      if (endMarker.selectType !== SelectType.fixed)
        endMarker.anchorVec = endMarker.anchorVec.multi(
          anchorLength / endMarker.anchorVec.length()
        );
    }

    //カント同期
    this.syncCant(endMarker, midPos);
  }
};

var CheckType = function (startMarker, endMarker) {
  this.startMarker = startMarker;
  this.endMarker = endMarker;
};
CheckType.prototype = {
  check: function (type_StartMarker, type_EndMarker) {
    //タイプの組み合わせを厳密にチェック
    return (
      this.startMarker.selectType === type_StartMarker &&
      this.endMarker.selectType === type_EndMarker
    );
  },
  checkSet: function (type1, type2) {
    //2つのタイプの組み合わせがあるかどうかをチェック
    return (
      (this.startMarker.selectType === type1 &&
        this.endMarker.selectType === type2) ||
      (this.startMarker.selectType === type2 &&
        this.endMarker.selectType === type1)
    );
  },
  include: function (type) {
    //タイプが含まれているかをチェック
    return (
      this.startMarker.selectType === type || this.endMarker.selectType === type
    );
  }
};

//##---------------------------------##
//##    擬似クラス: 3次元ベジェ曲線    ##
//##---------------------------------##
function BezierCurve3D(
  startPosArray,
  startHandlePosArray,
  endHandlePosArray,
  endPosArray
) {
  this.p0 = startPosArray;
  this.p1 = startHandlePosArray;
  this.p2 = endHandlePosArray;
  this.p3 = endPosArray;
}
BezierCurve3D.prototype = {
  getPoint: function (split, index) {
    index = Math.min(Math.max(index, 0), split);
    var t = index / split;
    var u = 1 - t;
    var point = [
      u * u * u * this.p0[0] +
        3 * u * u * t * this.p1[0] +
        3 * u * t * t * this.p2[0] +
        t * t * t * this.p3[0],
      u * u * u * this.p0[1] +
        3 * u * u * t * this.p1[1] +
        3 * u * t * t * this.p2[1] +
        t * t * t * this.p3[1],
      u * u * u * this.p0[2] +
        3 * u * u * t * this.p1[2] +
        3 * u * t * t * this.p2[2] +
        t * t * t * this.p3[2]
    ];
    return point;
  },
  getYaw: function (split, index) {
    index = Math.min(Math.max(index, 0), split);
    var point1 = this.getPoint(split, index);
    var point2 = this.getPoint(split, index + 1);
    var dx = point2[0] - point1[0];
    var dz = point2[2] - point1[2];
    var yaw = Math.atan2(dz, dx);
    return yaw * (180 / Math.PI);
  },
  getPitch: function (split, index) {
    index = Math.min(Math.max(index, 0), split);
    var point1 = this.getPoint(split, index);
    var point2 = this.getPoint(split, index + 1);
    var dy = point2[1] - point1[1];
    var dx = point2[0] - point1[0];
    var dz = point2[2] - point1[2];
    var distance = Math.sqrt(dx * dx + dz * dz);
    var pitch = Math.atan2(dy, distance);
    return pitch * (180 / Math.PI);
  },
  getLength: function () {
    var dx = this.p3[0] - this.p0[0];
    var dy = this.p3[1] - this.p0[1];
    var dz = this.p3[2] - this.p0[2];
    //始点～終点直線距離の2倍を分割精度とする
    var distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    var split = Math.ceil(distance * 2);
    var length = 0;
    var previousPoint = this.getPoint(split, 0);
    for (var i = 1; i <= split; i++) {
      var currentPoint = this.getPoint(split, i);
      dx = currentPoint[0] - previousPoint[0];
      dy = currentPoint[1] - previousPoint[1];
      dz = currentPoint[2] - previousPoint[2];
      var segmentLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
      length += segmentLength;
      previousPoint = currentPoint;
    }
    return length;
  },
  getStartAnchorLength: function () {
    var dx = this.p1[0] - this.p0[0];
    var dy = this.p1[1] - this.p0[1];
    var dz = this.p1[2] - this.p0[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },
  getEndAnchorLength: function () {
    var dx = this.p3[0] - this.p2[0];
    var dy = this.p3[1] - this.p2[1];
    var dz = this.p3[2] - this.p2[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
};
