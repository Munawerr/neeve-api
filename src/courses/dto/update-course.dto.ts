export class UpdateCourseDto {
  readonly code?: string;
  readonly title?: string;
  readonly color?: {
    solid: string;
    accent: string;
  };
  iconUrl?: string;
}
