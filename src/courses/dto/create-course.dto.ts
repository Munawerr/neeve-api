export class CreateCourseDto {
  readonly code: string;
  readonly title: string;
  readonly color: {
    solid: string;
    accent: string;
  };
  iconUrl: string;
}
