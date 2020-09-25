function baseUrl() {
    return location.protocol + "//" + location.hostname + (location.port ? ":" + location.port : "") + "/";
}

function noop() {
}

const dev_inspector = {
    // initialize with NOOP functions
    startTrace: noop,
    resumeTrace: (traceId) => {
    },
    endTrace: noop,
    passTraceInfo: noop,
    tracePoint: (label) => {
    },
    tracePointByTraceId: (label, traceId) => {
    },
};


function setPerformanceRecordingDebugger(uid) {
    const context = {};
    const traces = [];

    function resetTrace(name, traceId) {
        context.traceId = traceId;
        context.currentTracing = {
            traceId: context.traceId,
            name: name,
            points: []
        };
        traces.push(context.currentTracing);
    }

    dev_inspector.startTrace = function (name) {
        const traceId = Math.floor(Math.random() * 1000000000);
        resetTrace(name, traceId);
    }
    dev_inspector.resumeTrace = function (traceId) {
        resetTrace(null, traceId);
    }
    dev_inspector.endTrace = function () {
        context.traceId = null;
        context.currentTracing = null;
    }
    dev_inspector.passTraceInfo = function (traceInfoReceiver) {
        if (!context.traceId) {
            return;
        }
        if (traceInfoReceiver) {
            traceInfoReceiver(context.traceId);
        }
    }
    dev_inspector.tracePoint = function (label) {
        if (!context.currentTracing) {
            return;
        }
        context.currentTracing.points.push({
            label: label,
            timestamp: Date.now()
        });
    }
    dev_inspector.tracePointByTraceId = function (label, traceId) {
        traces.push(
            {
                traceId: traceId,
                name: '',
                points: [{
                    label: label,
                    timestamp: Date.now(),
                }]
            }
        )
    }

    function sendTraces() {
        const toSend = [];
        while (traces.length > 0) {
            if (traces[0] === context.currentTracing) {
                break;
            }
            toSend.push(traces.shift());
        }
        if (toSend.length === 0) {
            return;
        }
        const data = {
            traces: toSend,
            originator: uid,
        }
        const request = new Request('/debug/add_traces', { method: 'POST', body: JSON.stringify(data) });
        request.headers.append('Content-Type', 'application/json');
        fetch(request);
    }

    setInterval(sendTraces, 5000);

    const button = document.createElement('button');
    button.setAttribute('id', 'show_performance_recording');
    button.innerText = 'Show Performance Recording';
    button.addEventListener('click', () => {
        alert(JSON.stringify(traces));
    });
    document.getElementsByTagName('body')[0].appendChild(button)
}

(function () {
    (async () => {
        const uid = Math.floor(Math.random() * 1000000000);
        const url = baseUrl() + "debug_setting";
        const response = await fetch(url);
        const data = response.json();
        const setting = await data;

        if (setting.performanceRecording) {
            setPerformanceRecordingDebugger(uid);
        }
    })();
})();


export {dev_inspector};