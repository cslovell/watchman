from kafka import KafkaProducer
from kafka.errors import KafkaError
from datetime import datetime
import json
import traceback
from operator import itemgetter as iget

def to_qcr_format(rec, campaign_thresh = 0.7, debug=False):
    if debug:
        print "Start conv, doing location"
        print "rec['location'] = ", rec['location']

    loc = sorted(rec['location'], key=iget('weight'), reverse=True)
    o_loc = None
    if len(loc) > 0:
        o_loc = {
            "type": "Point",
            "coordinates": [
                loc[0]["coords"][0]["lng"],
                loc[0]["coords"][0]["lat"]
            ]
        }
    if debug:
        print "Splitting campaigns"
    l_rec = []
    camps = filter(lambda x: x is not None, map(lambda x: [y for y in x.iteritems()][0] if x.values()[0]>campaign_thresh else None, rec['campaigns']))
    if debug:
        print "Max campaign association:", max([x.values()[0] for x in rec['campaigns']])
        print "n recs to transform: ", len(camps)
    for camp in camps:
        keywords = map(iget(0), sorted(rec['keywords'], key=iget(1), reverse=True))

        l_rec.append({
            'uid': rec['id'],
            'label': rec['hashtags'][0] if len(rec['hashtags']) > 0 else 'None',
            'startDate': datetime.fromtimestamp(rec['start_time_ms']/1000.0).isoformat(),
            'endDate': datetime.fromtimestamp(rec['end_time_ms']/1000.0).isoformat(),
            'domains': rec['domains'],
            'hashtags': rec['hashtags'],
            'keywords': keywords,
            'urls': rec['urls'],
            'photos': rec['image_urls'],
            'importanceScore': camp[1],
            'topicMessageCount':rec['topic_message_count'],
            'campaignId': camp[0],
            'newsEventIds': [],
            'location': o_loc
        })
    return l_rec

def stream_events(l_clusts, kafka_url, kafka_topic, debug=False):
    print "Converting to QCR format"
    try:
        kds = []
        for clust in l_clusts:
            kds.extend(to_qcr_format(clust, debug=debug))
    except Exception as exc:
        traceback.print_exc()

    producer = KafkaProducer(bootstrap_servers=kafka_url, value_serializer=lambda v: json.dumps(v).encode('utf-8'))
    print "Streaming Events"
    for doc in kds:
        try:
            state = producer.send(kafka_topic, doc)
            record_metadata = state.get(timeout=10)
            print (record_metadata.topic)
            print (record_metadata.partition)
            print (record_metadata.offset)
        except KafkaError as err:
            traceback.print_exc()
