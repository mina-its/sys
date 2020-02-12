"use strict";
exports.__esModule = true;
var types_1 = require("./types");
var types_2 = require("../types");
var ComponentParams = (function () {
    function ComponentParams() {
    }
    return ComponentParams;
}());
function component(name, props, params) {
    params.props = props;
    Vue.component(name, params);
}
exports.component = component;
function get(pack, objectName, options, done) {
}
exports.get = get;
function log() {
    var message = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        message[_i] = arguments[_i];
    }
    console.log(message);
}
exports.log = log;
function isRtl() {
    return false;
}
exports.isRtl = isRtl;
function invoke(pack, name, args) {
    return false;
}
exports.invoke = invoke;
function getText(pack, key) {
    if (text[pack + "." + key])
        return text[pack + "." + key];
    console.warn("Warning: text '" + pack + "." + key + "' not found");
    return key.replace(/-/g, " ");
}
exports.getText = getText;
function toFriendlyFileSizeString(size) {
    if (size < 1024)
        return size + " B";
    else if (size < 1024 * 1024)
        return (size / 1024).toFixed(1) + " KB";
    else
        return (size / 1024 / 1024).toFixed(1) + " MB";
}
exports.toFriendlyFileSizeString = toFriendlyFileSizeString;
function ajax(url, data, config, done, fail) {
    var params = { url: url, data: data };
    if (config && config.method)
        params.method = config.method;
    else
        params.method = data ? types_2.WebMethod.post : types_2.WebMethod.get;
    if (config && config.contentType)
        params.headers = { 'Content-Type': config.contentType };
    fail = fail || notify;
    axios(params).then(function (res) {
        if (res.code && res.code != types_2.StatusCode.Ok)
            fail({ code: res.code, message: res.message });
        else {
            try {
                done(res.data);
            }
            catch (ex) {
                notify("error on handling ajax response: " + ex.message);
                console.error(res, ex);
            }
        }
    })["catch"](function (err) {
        console.error("error on ajax '" + url + "'", err);
        if (err.response && err.response.data && err.response.data.message)
            fail({ message: err.response.data.message, code: err.response.data.code });
        else if (err.response && err.response.data)
            fail({ message: err.response.data, code: err.response.status });
        else
            fail({ message: err.toString(), code: types_2.StatusCode.UnknownError });
    });
}
exports.ajax = ajax;
var notifyCallback;
function setNotifyCallback(callback) {
    notifyCallback = callback;
}
exports.setNotifyCallback = setNotifyCallback;
function notify(content, type, params) {
    if (!content)
        return;
    var message = typeof content == "string" ? content : content.message;
    if (!type) {
        if (typeof content != "string")
            type = content.code && content.code != types_2.StatusCode.Ok ? types_1.NotifyType.Error : types_1.NotifyType.Information;
        else
            type = types_1.NotifyType.Information;
    }
    switch (type) {
        case types_1.NotifyType.Information:
            $("#snackbar").addClass("visible").text(message);
            setTimeout(function () {
                $("#snackbar").removeClass("visible");
            }, 3000);
            break;
        case types_1.NotifyType.Warning:
        case types_1.NotifyType.Error:
            notifyCallback({ title: getText('sys', 'error'), message: message, type: type });
            break;
    }
}
exports.notify = notify;
function head_script(src) {
    if (document.querySelector("script[src='" + src + "']")) {
        return;
    }
    var script = document.createElement('script');
    script.setAttribute('src', src);
    script.setAttribute('type', 'text/javascript');
    document.head.appendChild(script);
}
exports.head_script = head_script;
function body_script(src) {
    if (document.querySelector("script[src='" + src + "']")) {
        return;
    }
    var script = document.createElement('script');
    script.setAttribute('src', src);
    script.setAttribute('type', 'text/javascript');
    document.body.appendChild(script);
}
exports.body_script = body_script;
function del_script(src) {
    var el = document.querySelector("script[src='" + src + "']");
    if (el) {
        el.remove();
    }
}
exports.del_script = del_script;
function head_link(href) {
    if (document.querySelector("link[href='" + href + "']")) {
        return;
    }
    var link = document.createElement('link');
    link.setAttribute('href', href);
    link.setAttribute('rel', "stylesheet");
    link.setAttribute('type', "text/css");
    document.head.appendChild(link);
}
exports.head_link = head_link;
function body_link(href) {
    if (document.querySelector("link[href='" + href + "']")) {
        return;
    }
    var link = document.createElement('link');
    link.setAttribute('href', href);
    link.setAttribute('rel', "stylesheet");
    link.setAttribute('type', "text/css");
    document.body.appendChild(link);
}
exports.body_link = body_link;
function del_link(href) {
    var el = document.querySelector("link[href='" + href + "']");
    if (el) {
        el.remove();
    }
}
exports.del_link = del_link;
//# sourceMappingURL=main.js.map