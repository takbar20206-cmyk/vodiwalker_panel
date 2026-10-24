import 'package:flutter/material.dart';
import 'package:flutter/widgets.dart';

/// کارت glassmorphism — زمینه‌یِ بوم‌شده (blur) با حاشیه‌یِ روشن.
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets margin;
  final double radius;
  final Color? tint;
  final VoidCallback? onTap;
  final bool expanded;

  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.margin = const EdgeInsets.symmetric(horizontal: 16),
    this.radius = 22,
    this.tint,
    this.onTap,
    this.expanded = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    final decoration = BoxDecoration(
      color: (tint ?? c.surface)
          .withValues(alpha: 0.10)
          .withValues(alpha: 0.0),
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(
          color: Colors.white.withValues(alpha: 0.18), width: 1),
      boxShadow: const [
        BoxShadow(color: Color(0x0A000000), blurRadius: 24, offset: Offset(0, 12)),
      ],
    );
    return Padding(
      padding: margin,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(radius),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
              child: Container(
                height: expanded ? double.infinity : null,
                padding: padding,
                decoration: decoration,
                child: child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Chip قابل کلیک با ikon.
class GlassChip extends StatelessWidget {
  final Widget leading;
  final String label;
  final VoidCallback? onTap;
  final bool selected;

  const GlassChip({
    super.key,
    required this.leading,
    required this.label,
    this.onTap,
    this.selected = false,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white.withValues(
                alpha: selected ? 0.22 : 0.08),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
                color: Colors.white.withValues(
                    alpha: selected ? 0.5 : 0.14),
                width: 1),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [leading, const SizedBox(width: 8), Text(label)],
          ),
        ),
      ),
    );
  }
}
