/* =====================================================================
 * Shops.js — the four shops.
 *
 * A shop is `GD.Data.SHOPS` (community / mechanic / scratch / diamond) drawn as
 * item tiles: real icon art for icon stock, a colour swatch for palette stock,
 * and key/orb art for bundles. Buying spends the wallet in `GD.Save.wallet()`;
 * nothing here touches a server, and the footer says so.
 * ===================================================================== */
var SHOP_LAYOUT = {
    tabs:  { y: 448, h: 36, w: 150, pitch: 158, firstX: 250 },
    grid:  { firstX: 210, firstY: 330, pitchX: 148, pitchY: 118, columns: 5 },
    tile:  { width: 132, height: 104 }
};

/* One purchasable tile: art, name, price with its currency icon. */
function shopTile(layer, opts) {
    var item = opts.item;
    var owned = GD.Data.owned(item);

    var node = cc.Node.create();
    node.setPosition(opts.x, opts.y);
    layer.addChild(node, 6);

    node.addChild(GD.UI.nine(GD.UI.PANEL[owned ? "green" : "dark"],
                             SHOP_LAYOUT.tile.width, SHOP_LAYOUT.tile.height,
                             GD.UI.PANEL_INSETS), 0);

    var art = null;
    if (item.kind === "icon") {
        art = GD.iconSprite(item.pool, item.icon);
        if (!art) {
            // Atlas still decoding: draw the sheet frame and upgrade in place.
            art = GD.sprite(iconFrameName(item.pool, item.icon) || "player_01_001.png");
            if (art) GD.applyIcon(art, item.pool, item.icon);
        }
    }
    if (item.kind === "color") {
        art = cc.LayerColor.create(GD.c4(item.color), 44, 44);
        art.setPosition(0, 18);
    }
    if (!art) art = GD.sprite(item.reward ? "GJ_bigKey_001.png" : "GJ_diamondsIcon_001.png");

    if (art) {
        var size = art.getContentSize();
        art.setScale(Math.min(46 / (size.width || 44), 40 / (size.height || 44)));
        if (item.kind !== "color") art.setPosition(0, 18);
        node.addChild(art, 1);
    }

    var name = GD.label(item.name, { scale: GD.UI.TEXT.tiny, width: 124,
                                     align: cc.TEXT_ALIGNMENT_CENTER });
    name.setPosition(0, -14);
    node.addChild(name, 2);

    var priceIcon = GD.sprite(GD.Data.currencyIcon(opts.currency));
    priceIcon.setScale(0.42);
    priceIcon.setPosition(-20, -36);
    node.addChild(priceIcon, 2);

    var price = GD.label(owned ? "OWNED" : "" + item.price,
                         { scale: GD.UI.TEXT.tiny, anchor: [0, 0.5],
                           color: owned ? GD.UI.COLOR.green
                                        : GD.Data.canAfford(item.price, opts.currency)
                                            ? GD.UI.COLOR.gold : GD.UI.COLOR.red });
    price.setPosition(owned ? -18 : -6, -36);
    node.addChild(price, 2);

    // Invisible hit pad on top of the tile.
    GD.UI.hitPad(layer, {
        x: opts.x, y: opts.y, w: SHOP_LAYOUT.tile.width, h: SHOP_LAYOUT.tile.height,
        z: 8, onClick: function () { opts.onClick(item, owned); }
    });

    return node;
}

function shopPurchase(scene, item, currency, onDone) {
    if (GD.Data.owned(item)) {
        GD.UI.alert(scene, item.name, "You already own this.");
        return;
    }
    if (!GD.Data.canAfford(item.price, currency)) {
        GD.UI.alert(scene, "NOT ENOUGH", "You need " + item.price + " " +
                    GD.Data.currencyName(currency).toLowerCase() + ".");
        return;
    }
    GD.UI.confirm(scene, {
        title: item.name,
        message: "Buy for " + item.price + " " +
                 GD.Data.currencyName(currency).toLowerCase() + "?",
        okText: "BUY", okStyle: "green",
        onOk: function () {
            if (!GD.Data.spend(item.price, currency)) return;
            GD.Data.grant(item);
            GD.Audio.sfx("buy");
            GD.UI.toast(scene, "Bought: " + item.name);
            if (onDone) onDone();
        }
    });
}

function ShopScene(opts) {
    opts = opts || {};
    var shopId = opts.shop || "community";

    return GD.UI.screen({
        title: "SHOPS",
        titleY: 498,
        background: { top: [130, 60, 160], bottom: [30, 12, 44], ground: false },
        sheets: ["shop", "treasure"],
        back: function () { return new CreatorScene(); },
        layout: function (layer) {
            var scene = layer.getParent();
            var body = cc.Node.create();
            layer.addChild(body, 6);
            var tabs = cc.Node.create();
            layer.addChild(tabs, 20);

            // Wallet readout, top right.
            var wallet = GD.Save.wallet();
            var icon = GD.sprite("GJ_diamondsIcon_001.png");
            icon.setScale(0.62);
            icon.setPosition(838, 500);
            layer.addChild(icon, 31);
            var value = GD.label("" + wallet.diamonds,
                                 { scale: GD.UI.TEXT.small, anchor: [0, 0.5],
                                   color: GD.UI.COLOR.gold });
            value.setPosition(852, 500);
            layer.addChild(value, 31);

            function build() {
                var shop = GD.Data.shop(shopId);
                tabs.removeAllChildren(true);
                body.removeAllChildren(true);

                for (var t = 0; t < GD.Data.SHOPS.length; t++) {
                    (function (entry, index) {
                        GD.UI.button(tabs, {
                            x: SHOP_LAYOUT.tabs.firstX + index * SHOP_LAYOUT.tabs.pitch,
                            y: SHOP_LAYOUT.tabs.y, w: SHOP_LAYOUT.tabs.w,
                            h: SHOP_LAYOUT.tabs.h,
                            text: entry.name.split(" ")[0],
                            textScale: GD.UI.TEXT.tiny,
                            style: entry.id === shopId ? "green" : "slate",
                            z: 21, priority: 0,
                            onClick: function () { shopId = entry.id; build(); }
                        });
                    })(GD.Data.SHOPS[t], t);
                }

                var note = GD.label(shop.note, { scale: GD.UI.TEXT.tiny,
                                                 color: GD.UI.COLOR.dim });
                note.setPosition(GD.W / 2, 402);
                body.addChild(note, 2);

                var G = SHOP_LAYOUT.grid;
                for (var i = 0; i < shop.items.length && i < 10; i++) {
                    (function (item, index) {
                        shopTile(body, {
                            x: G.firstX + (index % G.columns) * G.pitchX,
                            y: G.firstY - Math.floor(index / G.columns) * G.pitchY,
                            item: item,
                            currency: shop.currency,
                            onClick: function () {
                                shopPurchase(scene, item, shop.currency, function () {
                                    GD.Nav.go(ShopScene({ shop: shopId }));
                                });
                            }
                        });
                    })(shop.items[i], i);
                }

                var footer = GD.label("Local shop - spending simulated currency only",
                                      { scale: GD.UI.TEXT.tiny, color: GD.UI.COLOR.locked });
                footer.setPosition(GD.W / 2, 44);
                body.addChild(footer, 2);
            }

            build();
        }
    });
}
