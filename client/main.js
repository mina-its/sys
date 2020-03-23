"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../src/types");
function component(name, props, params) {
    params.props = props;
    Vue.component(name, params);
}
exports.component = component;
function get(pack, objectName, options, done) {
}
exports.get = get;
function log(...message) {
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
    console.warn(`Warning: text '${pack}.${key}' not found`);
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
function joinUri(...parts) {
    let uri = "";
    for (let part of parts) {
        uri += "/" + (part || "").replace(/^\//, '').replace(/\/$/, '');
    }
    return uri.substr(1);
}
exports.joinUri = joinUri;
function ajax(url, data, config, done, fail) {
    let params = { url, data };
    if (config && config.method)
        params.method = config.method;
    else
        params.method = data ? types_1.WebMethod.post : types_1.WebMethod.get;
    if (data && data._files) {
        params.data = new FormData();
        for (let file of data._files) {
            params.data.append('files[]', file, file['name']);
        }
        params.data.append('data', JSON.stringify(data));
        params.headers = { 'Content-Type': 'multipart/form-data' };
    }
    fail = fail || notify;
    axios(params).then((res) => {
        if (res.code && res.code != types_1.StatusCode.Ok)
            fail({ code: res.code, message: res.message });
        else {
            try {
                done(res.data);
            }
            catch (ex) {
                notify(`error on handling ajax response: ${ex.message}`);
                console.error(res, ex);
            }
        }
    }).catch((err) => {
        console.error(`error on ajax '${url}'`, err);
        if (err.response && err.response.data && err.response.data.message)
            fail({ message: err.response.data.message, code: err.response.data.code });
        else if (err.response && err.response.data)
            fail({ message: err.response.data, code: err.response.status });
        else
            fail({ message: err.toString(), code: types_1.StatusCode.UnknownError });
    });
}
exports.ajax = ajax;
function notify(content, type, params) {
    if (!content)
        return;
    let message = typeof content == "string" ? content : content.message;
    if (!type) {
        if (typeof content != "string")
            type = content.code && content.code != types_1.StatusCode.Ok ? types_1.LogType.Error : types_1.LogType.Info;
        else
            type = types_1.LogType.Info;
    }
    window.dispatchEvent(new CustomEvent('notify', { detail: { message, type } }));
}
exports.notify = notify;
function question(questionId, message, options, select) {
    window.dispatchEvent(new CustomEvent('question', { detail: { questionId, message, options, select } }));
    $("#question-box").modal("show");
}
exports.question = question;
function getBsonId(item) {
    if (!item)
        throw "Item is null";
    else if (!item._id) {
        console.error("Invalid item data, _id is expected:", item);
        notify('Invalid data, please check the logs!');
        return null;
    }
    else
        return item._id.$oid;
}
exports.getBsonId = getBsonId;
function head_script(src) {
    if (document.querySelector("script[src='" + src + "']")) {
        return;
    }
    let script = document.createElement('script');
    script.setAttribute('src', src);
    script.setAttribute('type', 'text/javascript');
    document.head.appendChild(script);
}
exports.head_script = head_script;
function body_script(src) {
    if (document.querySelector("script[src='" + src + "']")) {
        return;
    }
    let script = document.createElement('script');
    script.setAttribute('src', src);
    script.setAttribute('type', 'text/javascript');
    document.body.appendChild(script);
}
exports.body_script = body_script;
function del_script(src) {
    let el = document.querySelector("script[src='" + src + "']");
    if (el) {
        el.remove();
    }
}
exports.del_script = del_script;
function head_link(href) {
    if (document.querySelector("link[href='" + href + "']")) {
        return;
    }
    let link = document.createElement('link');
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
    let link = document.createElement('link');
    link.setAttribute('href', href);
    link.setAttribute('rel', "stylesheet");
    link.setAttribute('type', "text/css");
    document.body.appendChild(link);
}
exports.body_link = body_link;
function del_link(href) {
    let el = document.querySelector("link[href='" + href + "']");
    if (el) {
        el.remove();
    }
}
exports.del_link = del_link;
function setPropertyEmbeddedError(doc, propName, error) {
    if (!doc)
        throw `setPropertyEmbeddedError doc is empty, prop:${propName}!`;
    doc._ = doc._ || {};
    doc._[propName] = doc._[propName] || {};
    doc._[propName].err = error;
}
exports.setPropertyEmbeddedError = setPropertyEmbeddedError;
//# sourceMappingURL=main.js.map