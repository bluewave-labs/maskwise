import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom password validation decorator
 *
 * Enforces strong password requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (!@#$%^&*(),.?":{}|<>)
 *
 * @param validationOptions - Optional validation options for customizing error message
 *
 * @example
 * ```typescript
 * class RegisterDto {
 *   @IsStrongPassword()
 *   password: string;
 * }
 * ```
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          // Minimum 12 characters
          if (value.length < 12) {
            return false;
          }

          // At least one uppercase letter
          if (!/[A-Z]/.test(value)) {
            return false;
          }

          // At least one lowercase letter
          if (!/[a-z]/.test(value)) {
            return false;
          }

          // At least one number
          if (!/[0-9]/.test(value)) {
            return false;
          }

          // At least one special character
          if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return (
            'Password must be at least 12 characters long and contain: ' +
            '1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (!@#$%^&*(),.?":{}|<>)'
          );
        },
      },
    });
  };
}
