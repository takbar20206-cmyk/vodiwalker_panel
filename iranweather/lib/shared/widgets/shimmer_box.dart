import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

/// Box muzzi، در حال بارگذاری — استفاده در صفحه‌ی home.
class ShimmerBox extends StatelessWidget {
  final double height;
  final double radius;

  const ShimmerBox({super.key, this.height = 84, this.radius = 22});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: const Color(0x1AFFFFFF),
      highlightColor: const Color(0x2EFFFFFF),
      child: Container(
        height: height,
        decoration: BoxDecoration(
          color: const Color(0x0FFFFFFF),
          borderRadius: BorderRadius.circular(radius),
          border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
        ),
      ),
    );
  }
}

/// اسپینِ loading معمول.
class LoadingDots extends StatelessWidget {
  final double size;

  const LoadingDots({super.key, this.size = 22});

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      width: size,
      height: size,
      child: SpinKitFadingCube(
        color: Colors.white,
        shape: BoxShape.circle,
      ),
    );
  }
}
