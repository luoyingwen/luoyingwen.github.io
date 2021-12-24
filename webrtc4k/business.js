function startMeeting()
{
    var connection = new RTCMultiConnection();

    // this line is VERY_important
    connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';

    // if you want audio+video conferencing
    connection.session = {
        audio: false,
        video: true,
    };
    connection.mediaConstraints = {
        audio: false,
        video: {
            width: { 
                ideal: 3840,
                min: 1280,
                max: 3840
             },
            height: { 
                ideal: 2160,
                min: 720,
                max: 2160
            }
        }
    };
    connection.processSdp = function(sdp) {
        //sdp = connection.CodecsHandler.preferCodec(sdp, 'h264');
        //sdp = connection.CodecsHandler.setVideoBitrates(sdp, {min: 30000, max: 30000});
        
        let parsedSdp = SDPTools.parseSDP(sdp)
        for(let i = 0; i < parsedSdp.media.length; i++){
            let media = parsedSdp.media[i]
            let codec = ['VP9','VP8']
            console.warn("删除VP8、VP9编码")
            var ASBitrate= 10000
            ASBitrate = ASBitrate || 4096
            SDPTools.removeCodecByName(parsedSdp, i, codec)
            SDPTools.setXgoogleBitrate(parsedSdp, ASBitrate, i)
            SDPTools.removeRembAndTransportCC(parsedSdp, i)
            media.payloads = media.payloads.trim()
        }
        sdp = SDPTools.writeSDP(parsedSdp)

        return sdp;
    };
    connection.openOrJoin('videotest_uhd');
    console.log(connection.mediaConstraints.video);
}