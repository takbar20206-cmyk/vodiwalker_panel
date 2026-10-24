import 'package:flutter_test/flutter_test.dart';

import 'package:iranweather/core/models/earthquake_model.dart';

void main() {
  test('parse یک زلزله از JSON', () {
    final json = <String, dynamic>{
      'id': 'us7000abc',
      'properties': {
        'mag': 5.4,
        'place': 'southern Iran',
        'time': 1700000000000,
        'source': 'us',
      },
      'geometry': {
        'coordinates': [52.5, 30.2, 12.0],
      },
    };
    final q = Earthquake.fromJson(json);
    expect(q.magnitude, 5.4);
    expect(q.latitude, 30.2);
    expect(q.longitude, 52.5);
    expect(q.depthKm, 12.0);
  });

  test('رنگ بندی بر اساس بزرگی', () {
    expect(const Earthquake(
            id: 'a', magnitude: 8.2, latitude: 0, longitude: 0,
            time: DateTime(2020), place: '', placeEn: '', depth: 1,
            network: 'x').severityColor,
        isA<Color>());
  });

  test('فاصله از نقطه', () {
    final q = Earthquake(
      id: 'b',
      magnitude: 4,
      latitude: 35.7,
      longitude: 51.4,
      time: DateTime(2020),
      place: '',
      placeEn: '',
      depth: 10,
      network: 'x',
    );
    final d = q.distanceKmFrom(35.7, 51.4);
    expect(d, lessThan(1));
  });
}
