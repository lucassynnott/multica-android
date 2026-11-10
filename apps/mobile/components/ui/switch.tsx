import { cn } from '@/lib/utils';
import * as SwitchPrimitives from '@rn-primitives/switch';
import { Platform } from 'react-native';

/**
 * 24x42 track with a 20dp thumb, accent when on, no shadow. The track itself
 * is shorter than a touch target, so the default `hitSlop` pads it to 44dp;
 * rows that wrap the switch in a Pressable are unaffected.
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root
      className={cn(
        'flex h-6 w-[42px] shrink-0 flex-row items-center rounded-full border border-transparent',
        Platform.select({
          web: 'focus-visible:border-ring focus-visible:ring-ring/50 peer inline-flex outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed',
        }),
        props.checked ? 'bg-primary' : 'bg-input dark:bg-input/80',
        props.disabled && 'opacity-50',
        className
      )}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      {...props}>
      <SwitchPrimitives.Thumb
        className={cn(
          'bg-background size-5 rounded-full transition-transform',
          Platform.select({
            web: 'pointer-events-none block ring-0',
          }),
          props.checked
            ? 'dark:bg-primary-foreground translate-x-5'
            : 'dark:bg-foreground translate-x-0'
        )}
      />
    </SwitchPrimitives.Root>
  );
}

export { Switch };
